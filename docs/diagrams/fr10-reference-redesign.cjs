const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr10-report-spec.json'))));
