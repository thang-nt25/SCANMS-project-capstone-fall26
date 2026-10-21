const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr11-report-spec.json'))));
