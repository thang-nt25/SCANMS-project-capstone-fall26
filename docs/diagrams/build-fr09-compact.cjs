const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'FR09_Configure_Monthly_Revenue_Bonus_Milestones_Sequence_Diagram_Compact.drawio');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','&#xa;');
let id=2, cells=[];
const base='html=0;fontFamily=Arial;fontSize=14;fontColor=#000000;';
function box(value,x,y,w,h,style='') { cells.push(`<mxCell id="${id++}" value="${esc(value)}" style="${base}${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`); }
function line(x,y,xx,yy,style='',points='') {cells.push(`<mxCell id="${id++}" value="" style="${base}strokeColor=#000000;${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x}" y="${y}" as="sourcePoint"/><mxPoint x="${xx}" y="${yy}" as="targetPoint"/>${points}</mxGeometry></mxCell>`);}
const xs=[90,340,590,840,1090];
box('FR-09 | Configure Monthly Revenue Bonus Milestones',30,15,1140,32,'text;align=left;fontSize=22;fontStyle=1;');
box('Precondition: Shop Manager is authenticated and authorized for the selected Store.',30,49,1140,24,'text;align=left;fontSize=13;');
for(const x of xs) line(x,137,x,787,'dashed=1;endArrow=none;');
box('Shop Manager',74,70,32,48,'shape=umlActor;fillColor=#FFFFFF;strokeColor=#000000;verticalLabelPosition=bottom;verticalAlign=top;');
['CommissionRulesPage','CommissionRulesController','CommissionRulesService','Database'].forEach((s,i)=>box(s,xs[i+1]-105,91,210,46,'fillColor=#FFFFFF;strokeColor=#000000;fontStyle=1;whiteSpace=wrap;'));
// Execution specifications follow the request and its response.
for(const [x,y,h] of [[340,165,99],[590,198,33],[840,198,33],[1090,198,33],[340,302,426],[590,335,360],[840,368,294],[1090,401,33],[1090,596,33]]) box('',x-5,y,10,h,'fillColor=#FFFFFF;strokeColor=#000000;');
let n=0;
function msg(a,b,y,label,ret=false){let x=xs[a],xx=xs[b];line(x,y,xx,y,ret?'dashed=1;endArrow=open;endFill=0;':'endArrow=block;endFill=1;');box(`${++n}. ${label}`,Math.min(x,xx)+9,y-25,Math.abs(xx-x)-18,23,'text;fillColor=#FFFFFF;strokeColor=none;align=center;fontSize=13;');}
msg(0,1,165,'Open milestone configuration');
// A UML reference compresses the already documented list-read interaction.
box('ref   Load existing milestones: GET rules â†’ findAll(storeId) â†’ Database',355,183,775,34,'fillColor=#FFFFFF;strokeColor=#000000;align=center;fontSize=13;');
msg(1,0,264,'Display milestones',true);
msg(0,1,302,'Add / edit details; click Save');
msg(1,2,335,'POST / PATCH rule');
msg(2,3,368,'create(...) / update(...)');
msg(3,4,401,'Verify Store; read rule if editing');
msg(4,3,434,'Store / current rule',true);
line(840,468,845,483,'endArrow=block;endFill=1;','<Array as="points"><mxPoint x="890" y="468"/><mxPoint x="890" y="483"/></Array>');
box(`${++n}. Validate input; begin transaction;\ncheck duplicate threshold and rate order`,600,444,230,47,'text;fillColor=#FFFFFF;strokeColor=none;align=center;fontSize=13;');
// A break fragment ends the interaction on failure, rather than implying a save follows.
box('',40,500,1120,70,'fillColor=none;strokeColor=#000000;');
box('break [validation fails / rule not found]',48,502,390,22,'text;fillColor=#FFFFFF;strokeColor=none;align=left;fontStyle=1;fontSize=13;');
msg(3,1,551,'Return error via controller; show message (rollback if transaction started)',true);
msg(3,4,596,'Save rule + audit; commit');
msg(4,3,629,'Saved rule',true);
msg(3,2,662,'Created / updated rule',true);
msg(2,1,695,'201 Created / 200 OK',true);
msg(1,0,728,'Close form; show success',true);
box('ref   Refresh milestone list using the same GET rules interaction',355,747,775,32,'fillColor=#FFFFFF;strokeColor=#000000;fontSize=13;');
box('Create: version = 1. Update: same rule, version + 1. API client, guards, pipes and individual database checks are abbreviated.',30,801,1140,25,'text;align=left;fontSize=12;');
fs.writeFileSync(out,`<mxfile host="app.diagrams.net"><diagram id="fr09-compact" name="Configure monthly revenue bonus milestones"><mxGraphModel grid="0" page="1" pageWidth="1200" pageHeight="848" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('\n')}</root></mxGraphModel></diagram></mxfile>`);
console.log(out);
