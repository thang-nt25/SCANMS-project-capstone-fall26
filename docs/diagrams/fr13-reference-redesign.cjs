const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr13-report-spec.json'))));
