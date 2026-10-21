// Uses the same native UML shapes and layout renderer as FR9 / FR10-FR16.
const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr01-report-spec.json'))));
