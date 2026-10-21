const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr14-report-spec.json'))));
