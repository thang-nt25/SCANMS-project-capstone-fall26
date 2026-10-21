// Reuse FR9's UML shapes, typography, orthogonal routing and sequence spacing.
const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr02-report-spec.json'))));
