from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = APP_ROOT / "public" / "saicharan"
MODEL_PATH = OUTPUT_DIR / "tech-knight.glb"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    node = result.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = color
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if node.inputs.get("Coat Weight"):
        node.inputs["Coat Weight"].default_value = 0.28 if metallic > 0.5 else 0.1
    if node.inputs.get("Coat Roughness"):
        node.inputs["Coat Roughness"].default_value = roughness * 0.7
    if emission:
        node.inputs["Emission Color"].default_value = emission
        node.inputs["Emission Strength"].default_value = emission_strength
    return result


def finish_mesh(
    obj: bpy.types.Object,
    mat: bpy.types.Material,
    bevel: float = 0.06,
    segments: int = 3,
) -> bpy.types.Object:
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Edge bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.limit_method = "ANGLE"
    return obj


def rounded_box(
    name: str,
    location: tuple[float, float, float],
    size: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.07,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, mat, bevel)


def prism_xz(
    name: str,
    points: list[tuple[float, float]],
    depth: float,
    mat: bpy.types.Material,
    y: float = 0,
    bevel: float = 0.045,
) -> bpy.types.Object:
    count = len(points)
    front_y = y - depth / 2
    back_y = y + depth / 2
    vertices = [(x, front_y, z) for x, z in points]
    vertices += [(x, back_y, z) for x, z in points]
    faces = [tuple(range(count)), tuple(range(count, count * 2))[::-1]]
    for index in range(count):
        following = (index + 1) % count
        faces.append((index, following, following + count, index + count))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish_mesh(obj, mat, bevel)


def cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius_start: float,
    radius_end: float,
    mat: bpy.types.Material,
    vertices: int = 20,
) -> bpy.types.Object:
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=(start_vector + end_vector) / 2,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return finish_mesh(obj, mat, min(radius_start, radius_end) * 0.12, 2)


def ellipsoid(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    segments: int = 32,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=16, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (math.pi / 2, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=36,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def curve_path(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points, strict=True):
        point.co = (*coordinate, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def build_cape(violet: bpy.types.Material, cyan: bpy.types.Material) -> None:
    columns = 11
    rows = 10
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for row in range(rows):
        vertical = row / (rows - 1)
        z = 4.75 - vertical * 4.35
        left = -1.15 - vertical * 3.35
        right = 1.15 + vertical * 0.8
        for column in range(columns):
            horizontal = column / (columns - 1)
            x = left + (right - left) * horizontal
            wave = math.sin(horizontal * math.pi * 2 + vertical * 3.0) * 0.12
            depth = 0.48 + wave + math.sin(vertical * math.pi) * 0.2
            bottom_wave = math.sin(horizontal * math.pi * 3) * vertical * 0.18
            vertices.append((x, depth, z + bottom_wave))
    for row in range(rows - 1):
        for column in range(columns - 1):
            top_left = row * columns + column
            bottom_left = (row + 1) * columns + column
            faces.append(
                (top_left, top_left + 1, bottom_left + 1, bottom_left)
            )
    cape_mesh = bpy.data.meshes.new("CircuitCapeMesh")
    cape_mesh.from_pydata(vertices, [], faces)
    cape_mesh.update()
    cape = bpy.data.objects.new("CircuitCape", cape_mesh)
    bpy.context.collection.objects.link(cape)
    cape.data.materials.append(violet)
    solidify = cape.modifiers.new("Cape thickness", "SOLIDIFY")
    solidify.thickness = 0.045
    bevel = cape.modifiers.new("Cape edge softness", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 2

    circuits = [
        [(-3.65, 0.39, 1.1), (-2.85, 0.33, 1.55), (-2.45, 0.38, 2.2), (-1.85, 0.33, 2.32)],
        [(-2.85, 0.35, 0.75), (-2.25, 0.31, 1.25), (-2.0, 0.32, 1.9), (-1.45, 0.31, 2.55)],
        [(-1.85, 0.33, 0.48), (-1.42, 0.29, 1.16), (-1.2, 0.3, 2.1), (-0.72, 0.28, 2.72)],
        [(-0.65, 0.28, 0.55), (-0.3, 0.25, 1.28), (-0.55, 0.27, 1.7), (0.05, 0.25, 2.35)],
        [(0.42, 0.27, 0.72), (0.68, 0.26, 1.42), (0.42, 0.28, 2.1), (0.9, 0.28, 2.75)],
    ]
    for index, points in enumerate(circuits, 1):
        curve_path(f"CapeCircuit{index:02}", points, 0.026, cyan)


def build_helmet(
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    blue: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    prism_xz(
        "Faceplate",
        [(-0.44, 5.36), (0, 5.08), (0.44, 5.36), (0.48, 6.0), (0, 6.2), (-0.48, 6.0)],
        0.5,
        graphite,
        y=-0.04,
        bevel=0.055,
    )
    prism_xz(
        "HelmetCrownBase",
        [(-0.62, 5.9), (-0.52, 6.3), (0, 6.5), (0.52, 6.3), (0.62, 5.9), (0, 6.07)],
        0.58,
        dark_silver,
        y=0.02,
    )
    prism_xz(
        "CrownCenter",
        [(-0.22, 6.1), (0, 6.76), (0.22, 6.1), (0, 5.9)],
        0.62,
        blue,
        y=-0.06,
    )
    prism_xz(
        "CrownCenterInlay",
        [(-0.075, 6.14), (0, 6.4), (0.075, 6.14), (0, 6.01)],
        0.66,
        cyan,
        y=-0.08,
        bevel=0.025,
    )
    prism_xz(
        "CrownWingLeft",
        [(-0.58, 6.02), (-0.84, 6.2), (-0.72, 6.62), (-0.56, 6.4), (-0.2, 6.1)],
        0.54,
        silver,
        y=0,
    )
    prism_xz(
        "CrownWingRight",
        [(0.58, 6.02), (0.84, 6.2), (0.72, 6.62), (0.56, 6.4), (0.2, 6.1)],
        0.54,
        silver,
        y=0,
    )
    prism_xz(
        "TempleFinLeft",
        [(-0.4, 5.72), (-1.38, 5.77), (-0.52, 5.96)],
        0.12,
        cyan,
        y=-0.02,
        bevel=0.02,
    )
    prism_xz(
        "TempleFinRight",
        [(0.4, 5.72), (1.38, 5.77), (0.52, 5.96)],
        0.12,
        cyan,
        y=-0.02,
        bevel=0.02,
    )
    ellipsoid("LeftEye", (-0.21, -0.33, 5.74), (0.125, 0.035, 0.052), cyan)
    ellipsoid("RightEye", (0.21, -0.33, 5.74), (0.125, 0.035, 0.052), cyan)
    prism_xz(
        "NeckGuard",
        [(-0.28, 5.04), (0, 4.82), (0.28, 5.04), (0.22, 5.42), (-0.22, 5.42)],
        0.42,
        silver,
        y=0.05,
    )
    curve_path("NeckCenterSeam", [(0, -0.19, 4.91), (0, -0.19, 5.37)], 0.022, dark_silver)


def build_torso(
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    prism_xz(
        "TorsoCore",
        [(-1.16, 3.2), (-1.34, 4.38), (-0.82, 4.98), (0.82, 4.98), (1.34, 4.38), (1.16, 3.2)],
        0.72,
        graphite,
        y=0.08,
        bevel=0.09,
    )
    prism_xz(
        "LeftPectoral",
        [(-1.24, 4.46), (-0.82, 4.9), (-0.08, 4.82), (-0.02, 4.08), (-1.03, 3.93)],
        0.34,
        silver,
        y=-0.36,
        bevel=0.06,
    )
    prism_xz(
        "RightPectoral",
        [(1.24, 4.46), (0.82, 4.9), (0.08, 4.82), (0.02, 4.08), (1.03, 3.93)],
        0.34,
        silver,
        y=-0.36,
        bevel=0.06,
    )
    curve_path("ChestChevronLeft", [(-1.2, -0.56, 4.02), (-0.04, -0.56, 3.83), (0, -0.56, 4.08)], 0.038, cyan)
    curve_path("ChestChevronRight", [(1.2, -0.56, 4.02), (0.04, -0.56, 3.83), (0, -0.56, 4.08)], 0.038, cyan)
    curve_path("ChestCollarLeft", [(-1.18, -0.56, 4.47), (-0.08, -0.56, 4.12)], 0.028, cyan)
    curve_path("ChestCollarRight", [(1.18, -0.56, 4.47), (0.08, -0.56, 4.12)], 0.028, cyan)
    prism_xz(
        "AbdominalPlate",
        [(-0.48, 3.86), (-0.42, 3.08), (0, 2.88), (0.42, 3.08), (0.48, 3.86), (0, 4.08)],
        0.3,
        silver,
        y=-0.34,
        bevel=0.055,
    )
    curve_path("AbCenterSeam", [(0, -0.51, 3.0), (0, -0.51, 4.0)], 0.025, dark_silver)
    rounded_box("Belt", (0, -0.02, 2.82), (1.75, 0.65, 0.22), dark_silver, bevel=0.06)
    rounded_box("BeltBuckle", (0, -0.38, 2.82), (0.42, 0.12, 0.26), silver, bevel=0.035)
    rounded_box("BeltLight", (0, -0.45, 2.84), (0.14, 0.04, 0.2), cyan, bevel=0.02)


def build_shoulder(
    side: int,
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    cyan: bpy.types.Material,
) -> tuple[float, float, float]:
    x = 1.5 * side
    location = (x, 0.02, 4.48)
    ellipsoid(f"{'Right' if side > 0 else 'Left'}ShoulderCore", location, (0.68, 0.5, 0.68), graphite)
    ellipsoid(
        f"{'Right' if side > 0 else 'Left'}Pauldron",
        (x, -0.1, 4.58),
        (0.76, 0.44, 0.58),
        silver,
    )
    torus(
        f"{'Right' if side > 0 else 'Left'}ShoulderHalo",
        (x, -0.49, 4.48),
        0.49,
        0.028,
        cyan,
    )
    prism_xz(
        f"{'Right' if side > 0 else 'Left'}ShoulderBlade",
        [
            (x - 0.6 * side, 4.85),
            (x + 0.78 * side, 5.12),
            (x + 0.6 * side, 4.43),
            (x - 0.3 * side, 4.1),
        ],
        0.34,
        dark_silver,
        y=-0.04,
        bevel=0.045,
    )
    return location


def build_left_arm(
    shoulder: tuple[float, float, float],
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    elbow = (-2.02, -0.08, 3.55)
    wrist = (-1.52, -0.3, 2.98)
    cylinder_between("LeftUpperArmCore", shoulder, elbow, 0.34, 0.29, graphite)
    cylinder_between("LeftUpperArmArmor", (-1.6, -0.05, 4.28), (-1.91, -0.07, 3.72), 0.39, 0.32, silver)
    ellipsoid("LeftElbow", elbow, (0.39, 0.36, 0.39), dark_silver)
    torus("LeftElbowLight", (elbow[0], -0.38, elbow[2]), 0.31, 0.035, cyan)
    cylinder_between("LeftForearmCore", elbow, wrist, 0.29, 0.25, graphite)
    cylinder_between("LeftForearmCuff", (-1.92, -0.13, 3.42), (-1.58, -0.27, 3.04), 0.42, 0.34, silver)
    curve_path("LeftArmLight", [(-1.91, -0.48, 3.44), (-1.61, -0.56, 3.08)], 0.024, cyan)
    ellipsoid("LeftFist", (-1.43, -0.38, 2.9), (0.38, 0.3, 0.33), dark_silver)
    for index in range(4):
        rounded_box(
            f"LeftKnuckle{index + 1}",
            (-1.68 + index * 0.15, -0.66, 2.98 + index * 0.025),
            (0.13, 0.18, 0.24),
            silver,
            rotation=(math.radians(8), 0, math.radians(-12)),
            bevel=0.045,
        )


def build_right_arm(
    shoulder: tuple[float, float, float],
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    elbow = (2.62, -0.06, 4.78)
    wrist = (3.76, -0.18, 5.25)
    palm = (4.17, -0.28, 5.43)
    cylinder_between("RightUpperArmCore", shoulder, elbow, 0.36, 0.3, graphite)
    cylinder_between("RightUpperArmArmor", (1.64, -0.05, 4.52), (2.47, -0.07, 4.75), 0.49, 0.36, silver)
    ellipsoid("RightElbow", elbow, (0.4, 0.37, 0.4), dark_silver)
    cylinder_between("RightForearmCore", elbow, wrist, 0.31, 0.27, graphite)
    cylinder_between("RightForearmArmor", (2.74, -0.09, 4.84), (3.72, -0.16, 5.23), 0.46, 0.34, silver)
    curve_path("RightUpperArmLight", [(1.7, -0.48, 4.55), (2.43, -0.49, 4.75)], 0.025, cyan)
    curve_path("RightForearmLight", [(2.8, -0.48, 4.87), (3.66, -0.5, 5.2)], 0.025, cyan)
    torus("RightWristLight", wrist, 0.34, 0.045, cyan, rotation=(math.pi / 2, math.radians(20), 0))
    ellipsoid("RightPalm", palm, (0.4, 0.3, 0.34), silver)
    index_joints = [palm, (4.58, -0.34, 5.66), (5.02, -0.33, 5.88), (5.38, -0.3, 6.0)]
    for index in range(len(index_joints) - 1):
        cylinder_between(
            f"PointingFinger{index + 1}",
            index_joints[index],
            index_joints[index + 1],
            0.115 - index * 0.015,
            0.105 - index * 0.015,
            silver if index != 1 else dark_silver,
            14,
        )
    for finger in range(3):
        base = (4.14 + finger * 0.08, -0.49, 5.33 - finger * 0.1)
        middle = (4.4 + finger * 0.05, -0.54, 5.21 - finger * 0.11)
        tip = (4.28 + finger * 0.04, -0.56, 5.03 - finger * 0.08)
        cylinder_between(f"RightFinger{finger + 1}A", base, middle, 0.1, 0.09, dark_silver, 12)
        cylinder_between(f"RightFinger{finger + 1}B", middle, tip, 0.09, 0.07, silver, 12)


def build_legs(
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    graphite: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    for side, label in [(-1, "Left"), (1, "Right")]:
        hip = (0.52 * side, 0.05, 2.62)
        knee = (0.68 * side, 0, 1.48)
        ankle = (0.78 * side, -0.01, 0.18)
        ellipsoid(f"{label}Hip", hip, (0.42, 0.4, 0.42), graphite)
        cylinder_between(f"{label}ThighCore", hip, knee, 0.37, 0.33, graphite)
        cylinder_between(f"{label}ThighArmor", (0.55 * side, -0.08, 2.48), (0.66 * side, -0.1, 1.62), 0.48, 0.39, silver)
        prism_xz(
            f"{label}KneeGuard",
            [
                (0.42 * side, 1.66),
                (0.69 * side, 2.03),
                (0.96 * side, 1.63),
                (0.72 * side, 1.28),
            ],
            0.36,
            dark_silver,
            y=-0.35,
            bevel=0.055,
        )
        curve_path(
            f"{label}KneeLight",
            [(0.49 * side, -0.56, 1.58), (0.69 * side, -0.56, 1.88), (0.88 * side, -0.56, 1.58)],
            0.032,
            cyan,
        )
        cylinder_between(f"{label}ShinCore", knee, ankle, 0.33, 0.3, graphite)
        outer = 1.1 * side
        inner = 0.36 * side
        prism_xz(
            f"{label}Greave",
            [(inner, 1.4), (outer, 1.28), (1.03 * side, 0.0), (0.43 * side, -0.12)],
            0.72,
            silver,
            y=-0.08,
            bevel=0.09,
        )
        curve_path(
            f"{label}GreaveLight",
            [(0.48 * side, -0.48, 1.22), (0.7 * side, -0.5, 0.9), (0.8 * side, -0.5, 0.1)],
            0.035,
            cyan,
        )
        rounded_box(
            f"{label}Boot",
            (0.79 * side, -0.35, -0.2),
            (0.92, 1.2, 0.42),
            dark_silver,
            rotation=(0, 0, math.radians(-2 * side)),
            bevel=0.13,
        )


def build_faulds(
    silver: bpy.types.Material,
    dark_silver: bpy.types.Material,
    cyan: bpy.types.Material,
) -> None:
    for side, label in [(-1, "Left"), (1, "Right")]:
        for layer in range(3):
            inner = 0.34 + layer * 0.04
            outer = 0.92 + layer * 0.13
            top = 2.75 - layer * 0.26
            bottom = 2.1 - layer * 0.23
            prism_xz(
                f"{label}Fauld{layer + 1}",
                [
                    (inner * side, top),
                    (outer * side, top - 0.12),
                    ((outer + 0.18) * side, bottom),
                    ((inner + 0.08) * side, bottom + 0.14),
                ],
                0.38,
                dark_silver if layer != 1 else silver,
                y=-0.12 - layer * 0.025,
                bevel=0.045,
            )
            curve_path(
                f"{label}FauldLight{layer + 1}",
                [
                    ((inner + 0.05) * side, -0.34 - layer * 0.025, top - 0.1),
                    ((outer + 0.06) * side, -0.34 - layer * 0.025, top - 0.2),
                ],
                0.025,
                cyan,
            )


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_preview() -> None:
    bpy.ops.object.camera_add(location=(9.5, -17.5, 7.2))
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    camera.data.lens = 58
    look_at(camera, (0.4, 0, 3.25))
    bpy.context.scene.camera = camera

    lights = [
        ("CyanKey", (5, -8, 9), (0.25, 0.85, 1.0), 800, 5.0),
        ("VioletRim", (-7, 1, 7), (0.3, 0.08, 1.0), 1100, 4.0),
        ("WhiteFill", (-3, -5, 5), (0.9, 0.95, 1.0), 520, 4.5),
    ]
    for name, location, color, energy, size in lights:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.color = color
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        look_at(light, (0, 0, 3.2))

    scene = bpy.context.scene
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.002, 0.003, 0.008)


def main() -> None:
    clear_scene()
    silver = material("PearlSilver", (0.62, 0.68, 0.7, 1), 0.6, 0.23)
    dark_silver = material("Gunmetal", (0.16, 0.2, 0.23, 1), 0.72, 0.26)
    graphite = material("Obsidian", (0.001, 0.002, 0.004, 1), 0.62, 0.26)
    blue = material("CrownBlue", (0.035, 0.08, 0.38, 1), 0.42, 0.24)
    violet = material("CircuitCapeViolet", (0.035, 0.02, 0.27, 1), 0.1, 0.52)
    cyan = material(
        "CircuitCyan",
        (0.02, 0.35, 0.58, 1),
        0.28,
        0.16,
        (0.01, 0.25, 0.8, 1),
        2.2,
    )

    build_cape(violet, cyan)
    build_torso(silver, dark_silver, graphite, cyan)
    build_helmet(silver, dark_silver, graphite, blue, cyan)
    left_shoulder = build_shoulder(-1, silver, dark_silver, graphite, cyan)
    right_shoulder = build_shoulder(1, silver, dark_silver, graphite, cyan)
    build_left_arm(left_shoulder, silver, dark_silver, graphite, cyan)
    build_right_arm(right_shoulder, silver, dark_silver, graphite, cyan)
    build_faulds(silver, dark_silver, cyan)
    build_legs(silver, dark_silver, graphite, cyan)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    configure_preview()
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL_PATH),
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(f"Wrote {MODEL_PATH}")


main()
