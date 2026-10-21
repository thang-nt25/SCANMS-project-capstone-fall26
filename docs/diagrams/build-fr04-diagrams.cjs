// Same native UML shapes, fonts, column placement and captions as FR9/FR01-FR03.
const {build}=require('./report-uml-layout.cjs');
console.log(JSON.stringify(build(require('./fr04-report-spec.json'))));
