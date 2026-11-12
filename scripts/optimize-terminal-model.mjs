// Builds public/models/vintage-terminal.glb from the Sketchfab download
// ("Vintage Terminal" by NoMoreFeelings, CC BY 4.0) kept in assets/models/.
//
// Run it with the glTF tooling installed outside the project:
//   npm i --no-save @gltf-transform/core@4.1.1 @gltf-transform/extensions@4.1.1 \
//     @gltf-transform/functions@4.1.1 sharp@0.33.5 meshoptimizer@0.22.0
//   node scripts/optimize-terminal-model.mjs assets/models/vintage-terminal.source.glb public/models/vintage-terminal.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, textureCompress, meshopt, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const [src, out] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
const root = doc.getRoot();
const byNode = Object.fromEntries(root.listNodes().map(n => [n.getName(), n]));
// Meaningful names, so the component can find parts by name.
const names = { Object_2: 'keyboard', Object_3: 'screen', Object_4: 'bezel', Object_5: 'cable', Object_6: 'case', Object_7: 'keycaps' };
for (const [k, v] of Object.entries(names)) {
  byNode[k].setName(v);
  byNode[k].getMesh().setName(v);
  byNode[k].getMesh().listPrimitives()[0].getMaterial().setName(v);
}
// The coiled cable is 1,320 of the 2,557 triangles and runs off to the side/back.
byNode.Object_5.dispose();
for (const m of root.listMaterials()) {
  // Metallic is 0 everywhere; without an env map the roughness maps barely
  // read, so a flat roughness saves 6 textures.
  m.setMetallicRoughnessTexture(null);
  m.setRoughnessFactor(0.8);
  m.setMetallicFactor(0);
}
// The screen glass is replaced at runtime; drop its textures entirely.
const screen = root.listMaterials().find(m => m.getName() === 'screen');
screen.setBaseColorTexture(null).setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]).setBaseColorFactor([0.01, 0.03, 0.02, 1]);
// Tangents are only needed for normal maps; three derives them in the shader.
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) p.setAttribute('TANGENT', null);
await doc.transform(
  prune(), dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }),
  quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  prune(),
);
await io.write(out, doc);
