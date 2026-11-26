/* RelionDeLuxe native adapter, GPL-2.0-or-later.
 * Uses the official RELION PipeLine / RelionJob API without replacing it.
 * Build inside a matching RELION 5.0 source/build tree (see README).
 */
#include "src/pipeliner.h"
#include "src/pipeline_control.h"
#include <algorithm>
#include <stdexcept>
#include "json.hpp"
#ifndef RELIONDELUXE_SOURCE_VERSION
#define RELIONDELUXE_SOURCE_VERSION RELION_SHORT_VERSION
#endif
static const int spaTypes[]={
#include "job_types.inc"
};
bool spa(int t){return std::find(std::begin(spaTypes),std::end(spaTypes),t)!=std::end(spaTypes);}
static const int tomoTypes[]={
#include "job_types-tomo.inc"
};
bool tomoMode(){const char *mode=std::getenv("RELIONDELUXE_MODE");return mode&&std::string(mode)=="tomo";}
bool supportedType(int t){return tomoMode()?std::find(std::begin(tomoTypes),std::end(tomoTypes),t)!=std::end(tomoTypes):spa(t);}
bool tomoVariant(int t){return t==PROC_MOTIONCORR||t==PROC_CTFFIND||t==PROC_INIMODEL||t==PROC_3DCLASS||t==PROC_3DAUTO||t==PROC_POST;}
bool supportedJob(const RelionJob &j){return supportedType(j.type)&&j.is_tomo==(tomoMode()&&tomoVariant(j.type));}
void ensure(bool ok,const std::string &msg){if(!ok)throw std::runtime_error(msg);}
#include "trash.hpp"
#include "helical.hpp"
#include "reschedule.hpp"
#include "clone_continuation.hpp"
#include "browser_selection.hpp"
#include "browser_picker.hpp"
#include "browser_tomo.hpp"
void snapshot(PipeLine &p){
 std::cout<<"\n@@RELIONDELUXE@@{\"counter\":"<<p.job_counter<<",\"jobs\":[";bool first=true;
 for(auto &j:p.processList){if(!first)std::cout<<",";first=false;
 std::cout<<"{\"name\":"<<quote(j.name)<<",\"alias\":"<<quote(j.alias)<<",\"type\":"<<j.type<<",\"status\":"<<quote(procstatus_type2label.at(j.status))<<",\"inputs\":[";
 bool f=true;for(auto id:j.inputNodeList){if(!f)std::cout<<",";f=false;std::cout<<quote(p.nodeList.at(id).name);}std::cout<<"],\"outputs\":[";
 f=true;for(auto id:j.outputNodeList){if(!f)std::cout<<",";f=false;std::cout<<quote(p.nodeList.at(id).name);}std::cout<<"]}";
 }std::cout<<"],\"nodes\":[";first=true;for(auto &n:p.nodeList){if(!first)std::cout<<",";first=false;std::cout<<"{\"name\":"<<quote(n.name)<<",\"type\":"<<quote(n.type)<<"}";}std::cout<<"]}";
}
int main(int argc,char **argv){
 try {
 ensure(argc>=2,"Expected action");std::string action=argv[1];
 if(action=="capabilities"){std::cout<<"\n@@RELIONDELUXE@@{\"relionVersion\":"<<quote(RELIONDELUXE_SOURCE_VERSION)<<",\"tomography\":true,\"browserTomoPicking\":true,\"browserTomoRegistration\":true,\"browserTiltExclusion\":true}";return 0;}
 if(action=="schema"){
  std::cout<<"\n@@RELIONDELUXE@@[";bool first=true;for(int t:(tomoMode()?std::vector<int>(std::begin(tomoTypes),std::end(tomoTypes)):std::vector<int>(std::begin(spaTypes),std::end(spaTypes)))){if(!first)std::cout<<",";first=false;RelionJob j;j.is_tomo=tomoMode()&&tomoVariant(t);j.initialise(t);writeSchema(j);}std::cout<<"]";return 0;
 }
 if(action=="star-schema"){
  ensure(argc==4,"Expected STAR file and block name");MetaDataTable table;table.read(argv[2],argv[3]);
  std::cout<<"\n@@RELIONDELUXE@@{\"rows\":"<<table.numberOfObjects()<<",\"labels\":[";bool first=true;
  for(auto label:table.getActiveLabels()){if(label==EMDL_UNKNOWN_LABEL)continue;if(!first)std::cout<<",";first=false;std::cout<<quote(EMDL::label2Str(label));}
  std::cout<<"],\"missingReferences\":[";std::set<std::string> seen,missing;first=true;
  const char *refs[]={"rlnImageName","rlnReferenceImage","rlnMicrographMovieName","rlnMicrographCoordinates","rlnMicrographMetadata","rlnUnfilteredMapHalf1","rlnUnfilteredMapHalf2","rlnMaskName","rlnBodyMaskName","rlnExperimentalDataStarFile","rlnModelStarFile","rlnModelStarFile2","rlnOrientSamplingStarFile"};
  std::vector<EMDLabel> labels;for(auto label:refs){auto id=EMDL::str2Label(label);if(table.containsLabel(id))labels.push_back(id);}
  if(std::string(argv[3])=="micrographs"&&table.containsLabel(EMDL_MICROGRAPH_NAME))labels.push_back(EMDL_MICROGRAPH_NAME);
  FOR_ALL_OBJECTS_IN_METADATA_TABLE(table){for(auto label:labels){std::string name;table.getValue(label,name);auto at=name.find('@');if(at!=std::string::npos)name=name.substr(at+1);if(name.empty()||name=="None"||!seen.insert(name).second)continue;struct stat st;if(stat(name.c_str(),&st)!=0||!S_ISREG(st.st_mode))missing.insert(name);}}
  size_t count=0;for(auto &name:missing){if(count++>=100)break;if(!first)std::cout<<",";first=false;std::cout<<quote(name);}std::cout<<"],\"missingReferenceCount\":"<<missing.size()<<"}";return 0;
 }
 if(action=="particle-optics"){
  ensure(argc==3,"Expected particles STAR file");MetaDataTable optics;optics.read(argv[2],"optics");
  ensure(optics.containsLabel(EMDL_IMAGE_PIXEL_SIZE)&&optics.containsLabel(EMDL_IMAGE_SIZE),"The optics table lacks rlnImagePixelSize or rlnImageSize");
  std::cout<<"\n@@RELIONDELUXE@@{\"rows\":[";bool first=true;
  FOR_ALL_OBJECTS_IN_METADATA_TABLE(optics){double pixel;int box;ensure(optics.getValue(EMDL_IMAGE_PIXEL_SIZE,pixel)&&optics.getValue(EMDL_IMAGE_SIZE,box),"Missing optics dimensions");
   ensure(std::isfinite(pixel)&&pixel>0&&box>4,"Invalid optics dimensions");
   if(!first)std::cout<<",";first=false;std::cout<<"{\"pixelSize\":"<<std::setprecision(17)<<pixel<<",\"boxSize\":"<<box<<"}";
  }std::cout<<"]}";return 0;
 }
 PipeLine p;std::string error;
 // Stock RELION's read/write pair takes and releases its own pipeline lock.
 if(action=="init") {ensure(!exists("default_pipeline.star"),"Project already exists");p.write(DONT_LOCK);touch(".gui_projectdir");std::cout<<"\n@@RELIONDELUXE@@{}";return 0;}
 ensure(exists("default_pipeline.star"),"No default_pipeline.star. Initialise the project first.");
 p.read(DONT_LOCK);
 if(browserTomoAction(p,action,argc,argv))return 0;
 if(browserPickerSave(p,action,argc,argv))return 0;
 if(browserSelectionSave(p,action,argc,argv))return 0;
 if(helicalAction(p,action,argc,argv))return 0;
 if(rescheduleAction(p,action,argc,argv))return 0;
 if(cloneContinuationAction(p,action,argc,argv))return 0;
 if(action=="state"){snapshot(p);return 0;}
 if(action=="refresh"){p.checkProcessCompletion();p.read(DONT_LOCK);snapshot(p);return 0;}
 if(action=="job"){
  ensure(argc==3,"Expected job directory");int id=p.findProcessByName(argv[2]);ensure(id>=0,"Unknown job");
  RelionJob j;bool cont;ensure(j.read(p.processList[id].name,cont,true),"Cannot read job settings");ensure(supportedJob(j),"Job mode does not match this server (SPA/STA); reopen using the correct mode");
  std::cout<<"\n@@RELIONDELUXE@@{\"type\":"<<j.type<<",\"isContinue\":"<<(cont?"true":"false")<<",\"values\":{";bool f=true;for(auto &kv:j.joboptions){if(!f)std::cout<<",";f=false;std::cout<<quote(kv.first)<<":"<<quote(kv.second.value);}std::cout<<"}}";return 0;
 }
 if(action=="preview" || action=="run" || action=="schedule" || action=="continue" || action=="browser-select" || action=="browser-pick" || action=="browser-tomo" || action=="browser-exclude"){
  ensure(argc==5,"Expected settings STAR, existing job or empty string, alias");
  RelionJob j;bool c;ensure(j.read(argv[2],c,true),"Cannot read settings");ensure(supportedJob(j),"Job mode does not match this server (SPA/STA); reopen using the correct mode");
  std::string existing=argv[3];int id=existing.empty()?-1:p.findProcessByName(existing);
  ensure(existing.empty() || id>=0,"Job no longer exists");
  bool scheduled=id>=0 && p.processList[id].status==PROC_SCHEDULED;
  bool savedContinue=false;
  if(scheduled){RelionJob saved;ensure(saved.read(existing,savedContinue,true),"Cannot read scheduled settings");}
  bool cont=id>=0 && (!scheduled||savedContinue);
  if(id>=0){ensure(p.processList[id].type==j.type,"Existing job type mismatch");ensure(p.processList[id].status!=PROC_RUNNING,"Cannot resubmit a running job");}
  if(action=="continue")ensure(cont,"Select an existing non-scheduled job to continue");
  if(action=="preview"){
   std::vector<std::string> commands;std::string final;
   ensure(p.getCommandLineJob(j,id,cont,scheduled,false,commands,final,error),error);
   continuationInput(j);
   std::cout<<"\n@@RELIONDELUXE@@{\"command\":"<<quote(final)<<",\"commands\":[";bool f=true;for(auto &s:commands){if(!f)std::cout<<",";f=false;std::cout<<quote(s);}std::cout<<"],\"jobName\":"<<quote(j.outputName)<<",\"inputs\":[";f=true;for(auto &node:j.inputNodes){if(!f)std::cout<<",";f=false;std::cout<<"{\"name\":"<<quote(node.name)<<",\"type\":"<<quote(node.type)<<"}";}std::cout<<"]}";
  }else{
   bool excluding=action=="browser-exclude";bool tomopicking=action=="browser-tomo";bool picking=action=="browser-pick";bool browser=action=="browser-select"||picking||tomopicking||excluding;
   if(excluding)ensure(tomoMode()&&j.type==57,"Expected STA Exclude tilt-images job");
   if(tomopicking)ensure(tomoMode()&&j.type==59,"Expected STA Pick tomograms job");
   if(picking)ensure(j.type==PROC_MANUALPICK||(j.type==PROC_AUTOPICK&&cont&&j.joboptions["continue_manual"].getBoolean()),"Expected manual picking or manual autopick continuation");
   if(browser&&!picking&&!tomopicking&&!excluding)ensure(j.type==PROC_CLASSSELECT&&!j.joboptions["do_recenter"].getBoolean()&&!j.joboptions["do_regroup"].getBoolean(),"Expected simple interactive selection");
   ensure(p.runJob(j,id,action=="schedule"||browser,cont,scheduled,error),error);
   if(!browser){std::remove((p.processList.at(id).name+"RELIONDELUXE_BROWSER_SELECTION").c_str());std::remove((p.processList.at(id).name+"RELIONDELUXE_BROWSER_PICKING").c_str());}
   if(browser){const std::string name=p.processList.at(id).name;if(tomopicking||excluding){std::remove((name+RELION_JOB_EXIT_SUCCESS).c_str());std::remove((name+RELION_JOB_EXIT_FAILURE).c_str());std::remove((name+RELION_JOB_EXIT_ABORTED).c_str());std::remove((name+"RELION_JOB_ABORT_NOW").c_str());}touch(name+(excluding?"RELIONDELUXE_BROWSER_EXCLUDE":tomopicking?"RELIONDELUXE_BROWSER_TOMO":picking?"RELIONDELUXE_BROWSER_PICKING":"RELIONDELUXE_BROWSER_SELECTION"));p.read(DO_LOCK,"Start browser selection");id=p.findProcessByName(name);p.processList[id].status=PROC_RUNNING;p.write(DO_LOCK);}

   // Alias failure must not turn a successfully submitted job into a retryable failure.
   std::string warning; if(std::string(argv[4])!="" && !p.setAliasJob(id,argv[4],error))warning=error;
   std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(p.processList.at(id).name)<<",\"warning\":"<<quote(warning)<<"}";
  }return 0;
 }
 if(action=="restore-plan"||action=="undelete"){
  ensure(argc>=3,"Expected Trash manifest");auto plan=restorationPlan(p,argv[2]);
  if(action=="restore-plan"){writePlan(plan);return 0;}
  ensure(argc==4&&namesOf(plan)==argv[3],"Restore scope changed; preview again");
  ensure(plan.blocked.empty(),plan.blocked.empty()?"":plan.blocked.front());
  restoreJobs(p,argv[2],plan);std::cout<<"\n@@RELIONDELUXE@@{}";return 0;
 }
 if(action=="delete-many-plan"||action=="delete-many"){
  ensure(argc>=4&&(std::string(argv[3])=="true"||std::string(argv[3])=="false"),"Expected selected jobs and recursive flag");
  std::vector<int> ids;std::set<std::string> seen;std::istringstream input(argv[2]);std::string name;
  while(std::getline(input,name,',')){ensure(canonicalJob(name)&&seen.insert(name).second,"Invalid or repeated selected job");int id=p.findProcessByName(name);ensure(id>=0,"Selected job no longer exists");ids.push_back(id);}
  ensure(!ids.empty()&&ids.size()<=1000,"Select between 1 and 1000 jobs");
  auto plan=deletionPlan(p,ids,std::string(argv[3])=="true");
  if(action=="delete-many-plan"){writePlan(plan);return 0;}
  ensure(argc==5&&namesOf(plan)==argv[4],"Deletion scope changed; preview again");ensure(plan.blocked.empty(),plan.blocked.empty()?"":plan.blocked.front());
  p.deleteNodesAndProcesses(plan.nodes,plan.processes);
  for(auto &j:plan.jobs)ensure(pathPresent("Trash/"+j.name)&&!pathPresent(j.name),"RELION could not move all job directories. Inspect the project before retrying.");
  std::cout<<"\n@@RELIONDELUXE@@{}";return 0;
 }
 ensure(argc>=3,"Expected job directory");int id=p.findProcessByName(argv[2]);ensure(id>=0,"Unknown job");ensure(supportedType(p.processList[id].type),"Job type is not supported in this server mode");
 if(action=="alias"){ensure(argc==4,"Expected alias");ensure(p.setAliasJob(id,argv[3],error),error);}
 else if(action=="abort"){ensure(p.processList[id].status==PROC_RUNNING,"Only running jobs can be aborted");touch(p.processList[id].name+RELION_JOB_ABORT_NOW);if(exists(p.processList[id].name+"RELIONDELUXE_BROWSER_EXCLUDE")||exists(p.processList[id].name+"RELIONDELUXE_BROWSER_TOMO")||exists(p.processList[id].name+"RELIONDELUXE_BROWSER_SELECTION")||exists(p.processList[id].name+"RELIONDELUXE_BROWSER_PICKING")){touch(p.processList[id].name+RELION_JOB_EXIT_ABORTED);p.checkProcessCompletion();}}
 else if(action=="mark-success" || action=="mark-failed"){ensure(p.markAsFinishedJob(id,error,action=="mark-failed"),error);}
 else if(action=="gentle-clean" || action=="harsh-clean"){ensure(p.processList[id].status!=PROC_RUNNING,"Cannot clean running jobs");ensure(p.cleanupJob(id,action=="harsh-clean",error),error);}
 else if(action=="delete-plan"||action=="delete"){
  ensure(argc>=4&&(std::string(argv[3])=="true"||std::string(argv[3])=="false"),"Expected recursive flag");
  auto plan=deletionPlan(p,id,std::string(argv[3])=="true");
  if(action=="delete-plan"){writePlan(plan);return 0;}
  ensure(argc==5&&namesOf(plan)==argv[4],"Deletion scope changed; preview again");
  ensure(plan.blocked.empty(),plan.blocked.empty()?"":plan.blocked.front());
  p.deleteNodesAndProcesses(plan.nodes,plan.processes);
  for(auto &j:plan.jobs)ensure(pathPresent("Trash/"+j.name)&&!pathPresent(j.name),"RELION could not move all job directories. Inspect the project before retrying.");
 }else throw std::runtime_error("Unsupported action");
 std::cout<<"\n@@RELIONDELUXE@@{}";return 0;
 }catch(RelionError &e){std::cerr<<e;return 1;}catch(std::exception &e){std::cerr<<e.what()<<"\n";return 1;}
}
