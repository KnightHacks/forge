import { mesh } from "topojson-client";
import countyTopologySource from "us-atlas/counties-10m.json";

type UsTopology = Parameters<typeof mesh>[0];
type UsGeometry = NonNullable<Parameters<typeof mesh>[1]>;

const countyTopology = countyTopologySource as unknown as UsTopology;
const countyGeometry = countyTopology.objects.counties as UsGeometry;
const stateGeometry = countyTopology.objects.states as UsGeometry;

export const flatMapCountyBoundaries = mesh(
  countyTopology,
  countyGeometry,
  (left, right) => left !== right,
).coordinates;

export const flatMapStateBoundaries = mesh(
  countyTopology,
  stateGeometry,
  (left, right) => left !== right,
).coordinates;
