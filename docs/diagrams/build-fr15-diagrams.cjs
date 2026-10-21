const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr15-report-spec.json'))));
