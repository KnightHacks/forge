import type {
  BoolVar,
  IntervalVar,
  IntVar,
  LiteralT,
  SolutionContext,
} from "@ortools-node/cp-sat";
import {
  CpModel,
  CpSolver,
  CpSolverSolutionCallback,
  CpSolverStatus,
  Domain,
  LinearExpr,
} from "@ortools-node/cp-sat";

import type { ScheduleProblem, ScheduleTask } from "./model";
import type { ScheduleSearch } from "./solver";
import { compareScheduleScores, scheduleSlotCount } from "./model";
import { validateScheduleSearch } from "./solver";
import { scoreSchedule } from "./validate";

interface Presentation {
  taskIndex: number;
  task: ScheduleTask;
  start: IntVar;
  end: IntVar;
  building: IntVar;
  choices: { roomIndex: number; selected: BoolVar }[];
}

/** Room intervals and each team's chronological circuit describe the whole schedule. */
function buildModel(problem: ScheduleProblem, relaxed: boolean) {
  const model = new CpModel();
  const slots = scheduleSlotCount(problem);
  const sameGap = Math.ceil(
    problem.sameBuildingBreakMinutes / problem.durationMinutes,
  );
  const crossGap = relaxed
    ? sameGap
    : Math.ceil(
        problem.differentBuildingBreakMinutes / problem.durationMinutes,
      );
  // Preserve the benchmarked model's variable/constraint order: CP-SAT's
  // bounded search can change when equivalent variables are renumbered.
  const buildings = problem.rooms.map((room) => room.buildingId);
  const rooms = problem.rooms.map((room) => ({
    ...room,
    intervals: [] as IntervalVar[],
    assignments: [] as { presentation: Presentation; selected: BoolVar }[],
  }));
  const projects = new Map<string, Presentation[]>();
  const activeRooms = new Map<number, (typeof rooms)[number]>();
  const presentations = problem.tasks.map((task, taskIndex) => {
    const eligible = rooms.flatMap((room, roomIndex) =>
      room.challengeId === task.challengeId ? [{ room, roomIndex }] : [],
    );
    const presentation: Presentation = {
      taskIndex,
      task,
      start: model.newIntVar(0, slots - 1, `start_${taskIndex}`),
      end: model.newIntVar(1, slots, `end_${taskIndex}`),
      building: model.newIntVarFromDomain(
        Domain.fromValues(
          eligible.map(({ room }) => buildings.lastIndexOf(room.buildingId)),
        ),
        `building_${taskIndex}`,
      ),
      choices: [],
    };
    model.addEquality(presentation.end, presentation.start.add(1));
    for (const { room, roomIndex } of eligible) {
      activeRooms.set(roomIndex, room);
      const selected = model.newBoolVar(`choose_${taskIndex}_${roomIndex}`);
      room.intervals.push(
        model.newOptionalIntervalVar(
          presentation.start,
          1,
          presentation.end,
          selected,
          `room_${taskIndex}_${roomIndex}`,
        ),
      );
      room.assignments.push({ presentation, selected });
      presentation.choices.push({ roomIndex, selected });
      model
        .addEquality(
          presentation.building,
          buildings.lastIndexOf(room.buildingId),
        )
        .onlyEnforceIf(selected);
    }
    model.addExactlyOne(presentation.choices.map(({ selected }) => selected));
    const itinerary = projects.get(task.projectId) ?? [];
    itinerary.push(presentation);
    projects.set(task.projectId, itinerary);
    return presentation;
  });
  for (const room of activeRooms.values()) model.addNoOverlap(room.intervals);

  const changes: BoolVar[] = [];
  const totalBreaks: LinearExpr[] = [];
  for (const [project, itinerary] of projects) {
    if (itinerary.length < 2) continue;
    // Dummy node zero closes the path; real arcs impose chronological travel.
    const arcs: [number, number, LiteralT][] = [];
    for (const [index, before] of itinerary.entries()) {
      arcs.push([0, index + 1, model.newBoolVar(`first_${before.taskIndex}`)]);
      arcs.push([index + 1, 0, model.newBoolVar(`last_${before.taskIndex}`)]);
    }
    for (const [index, before] of itinerary.entries()) {
      for (const [nextIndex, after] of itinerary.entries()) {
        if (index === nextIndex) continue;
        const pair = `${before.taskIndex}_${after.taskIndex}`;
        const follows = model.newBoolVar(`next_${pair}`);
        const different = model.newBoolVar(`different_${pair}`);
        model
          .addDifferent(before.building, after.building)
          .onlyEnforceIf(different);
        model
          .addEquality(before.building, after.building)
          .onlyEnforceIf(different.not());
        model
          .addGreaterOrEqual(after.start, before.end.add(sameGap))
          .onlyEnforceIf(follows);
        model
          .addGreaterOrEqual(after.start, before.end.add(crossGap))
          .onlyEnforceIf([follows, different]);
        const change = model.newBoolVar(`change_${pair}`);
        model.addLessOrEqual(change, follows);
        model.addLessOrEqual(change, different);
        model.addGreaterOrEqual(change, follows.add(different).sub(1));
        changes.push(change);
        arcs.push([index + 1, nextIndex + 1, follows]);
      }
    }
    model.addCircuit(arcs);
    const first = model.newIntVar(0, slots - 1, `first_start_${project}`);
    const last = model.newIntVar(0, slots - 1, `last_start_${project}`);
    model.addMinEquality(
      first,
      itinerary.map(({ start }) => start),
    );
    model.addMaxEquality(
      last,
      itinerary.map(({ start }) => start),
    );
    totalBreaks.push(last.sub(first).sub(itinerary.length - 1));
  }

  const sponsorFinish = model.newIntVar(0, slots, "sponsor_finish");
  const sponsorEnds = presentations
    .filter(({ task }) => task.sponsor)
    .map(({ end }) => end);
  model.addMaxEquality(sponsorFinish, sponsorEnds.length ? sponsorEnds : [0]);
  const overallFinish = model.newIntVar(0, slots, "overall_finish");
  model.addMaxEquality(
    overallFinish,
    presentations.map(({ end }) => end),
  );
  const idleTerms: IntVar[] = [];
  const equivalentRooms = new Map<string, IntVar[]>();
  for (const [roomIndex, room] of activeRooms) {
    const firstAssignment = room.assignments[0];
    if (!firstAssignment) continue;
    const count = model.newIntVar(0, slots, `count_${roomIndex}`);
    model.addEquality(
      count,
      LinearExpr.sum(room.assignments.map(({ selected }) => selected)),
    );
    // These rooms are interchangeable in every constraint and objective.
    const key = JSON.stringify([room.challengeId, room.buildingId]);
    const counts = equivalentRooms.get(key) ?? [];
    counts.push(count);
    equivalentRooms.set(key, counts);
    if (!firstAssignment.presentation.task.sponsor) continue;
    const starts: IntVar[] = [];
    const ends: IntVar[] = [];
    for (const { presentation, selected } of room.assignments) {
      const start = model.newIntVar(
        0,
        slots,
        `masked_start_${presentation.taskIndex}_${roomIndex}`,
      );
      const end = model.newIntVar(
        0,
        slots,
        `masked_end_${presentation.taskIndex}_${roomIndex}`,
      );
      model.addEquality(start, presentation.start).onlyEnforceIf(selected);
      model.addEquality(start, slots).onlyEnforceIf(selected.not());
      model.addEquality(end, presentation.end).onlyEnforceIf(selected);
      model.addEquality(end, 0).onlyEnforceIf(selected.not());
      starts.push(start);
      ends.push(end);
    }
    const first = model.newIntVar(0, slots, `room_first_${roomIndex}`);
    const last = model.newIntVar(0, slots, `room_last_${roomIndex}`);
    const used = model.newBoolVar(`used_${roomIndex}`);
    const idle = model.newIntVar(0, slots, `idle_${roomIndex}`);
    model.addMinEquality(first, starts);
    model.addMaxEquality(last, ends);
    model.addGreaterThan(count, 0).onlyEnforceIf(used);
    model.addEquality(count, 0).onlyEnforceIf(used.not());
    model.addEquality(idle, last.sub(first).sub(count)).onlyEnforceIf(used);
    model.addEquality(idle, 0).onlyEnforceIf(used.not());
    idleTerms.push(idle);
  }
  for (const counts of equivalentRooms.values()) {
    for (const [index, count] of counts.entries()) {
      const previous = counts[index - 1];
      if (previous) model.addGreaterOrEqual(previous, count);
    }
  }
  for (const challenge of new Set(
    problem.tasks.map((task) => task.challengeId),
  )) {
    const tasks = presentations.filter(
      ({ task }) => task.challengeId === challenge,
    );
    const capacity = rooms.filter(
      (room) => room.challengeId === challenge,
    ).length;
    const lower = Math.ceil(tasks.length / capacity);
    model.addGreaterOrEqual(overallFinish, lower);
    if (tasks.some(({ task }) => task.sponsor))
      model.addGreaterOrEqual(sponsorFinish, lower);
  }
  const objectives = [
    sponsorFinish,
    LinearExpr.sum(idleTerms),
    overallFinish,
    LinearExpr.sum(changes),
    LinearExpr.sum(totalBreaks).neg(),
  ];
  return { model, presentations, objectives };
}

/** Native async solves use eight threads inside Node, sharing one job deadline. */
export async function solveCpSat(
  problem: ScheduleProblem,
  search: ScheduleSearch,
  options: { deadline: Date; signal?: AbortSignal },
) {
  const timeout = AbortSignal.timeout(
    Math.max(1, options.deadline.getTime() - Date.now()),
  );
  const signal = options.signal
    ? AbortSignal.any([timeout, options.signal])
    : timeout;
  do {
    const { model, presentations, objectives } = buildModel(
      problem,
      search.relaxed,
    );
    const duration = problem.durationMinutes;
    for (const [index, value] of search.provenObjectives.entries()) {
      const objective = objectives[index];
      const divisor = index === 3 ? 1 : duration;
      if (!objective || value % divisor)
        throw new Error("Stored objective proof is off the slot grid.");
      model.addEquality(objective, value / divisor);
    }
    for (const placement of search.incumbent ?? []) {
      const presentation = presentations[placement.taskIndex];
      if (!presentation) throw new Error("Unknown stored presentation.");
      model.addHint(presentation.start, placement.slot);
      for (const { roomIndex, selected } of presentation.choices)
        model.addHint(selected, roomIndex === placement.roomIndex);
    }
    let retryRelaxed = false;
    for (
      let index = search.provenObjectives.length;
      index < objectives.length;
      index++
    ) {
      options.signal?.throwIfAborted();
      const remaining = options.deadline.getTime() - Date.now();
      if (remaining <= 0 || signal.aborted) return;
      const objective = objectives[index];
      if (!objective) throw new Error("Missing schedule objective.");
      model.minimize(objective);
      const solver = new CpSolver();
      solver.parameters.numSearchWorkers = 8;
      solver.parameters.maxTimeInSeconds = remaining / 1000;
      solver.parameters.randomSeed = 1;
      const branchBase = search.nodes;
      class Incumbents extends CpSolverSolutionCallback {
        error: Error | undefined;
        onSolutionCallback(context: SolutionContext) {
          if (this.error) return;
          try {
            const incumbent = presentations.map((presentation) => {
              const choice = presentation.choices.find(({ selected }) =>
                context.booleanValue(selected),
              );
              if (!choice)
                throw new Error("CP-SAT omitted a presentation's room.");
              return {
                taskIndex: presentation.taskIndex,
                roomIndex: choice.roomIndex,
                slot: Number(context.value(presentation.start)),
              };
            });
            const score = scoreSchedule(problem, incumbent);
            objectives.forEach((value, position) => {
              if (
                Number(context.value(value)) *
                  (position === 3 ? 1 : duration) !==
                score[position]
              )
                throw new Error(
                  "CP-SAT reported an incorrect candidate score.",
                );
            });
            const next = { ...search, incumbent, score };
            validateScheduleSearch(problem, next);
            if (!search.score || compareScheduleScores(score, search.score) < 0)
              Object.assign(search, next);
            search.nodes = Math.max(
              search.nodes,
              branchBase + context.numBranches,
            );
          } catch (error) {
            this.error =
              error instanceof Error
                ? error
                : new Error("Invalid solver candidate.");
            context.stopSearch();
          }
        }
      }
      const callback = new Incumbents();
      const status = await solver.solve(model, { signal, callback });
      if (callback.error) throw callback.error;
      options.signal?.throwIfAborted();
      search.nodes = Math.max(search.nodes, branchBase + solver.numBranches);
      if (status === CpSolverStatus.MODEL_INVALID)
        throw new Error(model.validate());
      if (status === CpSolverStatus.INFEASIBLE) {
        if (search.incumbent || search.provenObjectives.length)
          throw new Error("CP-SAT rejected a validated candidate or proof.");
        if (!search.relaxed) {
          search.relaxed = true;
          retryRelaxed = true;
          break;
        }
        search.exhausted = true;
        return;
      }
      if (status !== CpSolverStatus.OPTIMAL) return;
      const optimum = Math.round(solver.objectiveValue);
      const value = optimum * (index === 3 ? 1 : duration);
      if (search.score?.[index] !== value)
        throw new Error("Optimal objective has no matching incumbent.");
      search.provenObjectives.push(value);
      model.addEquality(objective, optimum);
      model.clearHints();
      for (
        let variableIndex = 0;
        variableIndex < model.proto.variables.length;
        variableIndex++
      ) {
        const variable = model.getIntVarFromProtoIndex(variableIndex);
        model.addHint(variable, solver.value(variable));
      }
      search.exhausted = search.provenObjectives.length === objectives.length;
    }
    if (!retryRelaxed) return;
  } while (!signal.aborted);
}
