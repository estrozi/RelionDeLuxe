// Register browser Pick jobs without invoking Napari's command builder.
// Volume validation is performed by tomoEditorInput before submission.
bool browserTomoAction(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action!="browser-tomo-preview"&&action!="browser-tomo")return false;
 ensure(argc==5,"Expected settings, existing job and alias");
 RelionJob j;bool savedCont;ensure(j.read(argv[2],savedCont,true)&&tomoMode()&&j.type==PROC_TOMO_PICK_TOMOGRAM,"Expected STA Pick tomograms job");
 ensure(j.joboptions["in_star_file"].value.empty(),"Imported native particle picks are read-only in the browser editor");
 const std::string input=j.joboptions["in_tomoset"].value,existing=argv[3];
 ensure(!input.empty()&&exists(input),"Input tomograms STAR file does not exist");
 const bool preview=action=="browser-tomo-preview";bool locked=false;
 try{
  if(!preview){p.read(DO_LOCK,"Start browser tomography picking");locked=true;}
  int id=existing.empty()?-1:p.findProcessByName(existing);
  ensure(existing.empty()||id>=0,"Job no longer exists");
  if(id>=0){ensure(p.processList[id].type==j.type,"Existing job type mismatch");ensure(p.processList[id].status!=PROC_RUNNING,"Cannot resubmit a running job");}
  const bool scheduled=id>=0&&p.processList[id].status==PROC_SCHEDULED;
  bool cont=id>=0&&!scheduled;
  if(scheduled){RelionJob old;ensure(old.read(existing,cont,true),"Cannot read scheduled settings");}
  if(!preview&&id>=0&&!scheduled)ensure(exists(existing+"RELIONDELUXE_BROWSER_TOMO"),"Existing native picks remain read-only. Create a new browser Pick job.");
  j.is_continue=cont;j.joboptions["do_queue"].value="No";
  std::string output=existing;j.initialisePipeline(output,p.job_counter);
  if(existing.empty())ensure(!exists(output),"New picking job directory already exists");
  j.inputNodes.push_back(Node(input,j.joboptions["in_tomoset"].node_type));
  const std::string mode=j.joboptions["pick_mode"].value;
  const std::string kind=mode=="spheres"?LABEL_TOMOPICK_PARTS_SPHERE:mode=="filaments"?LABEL_TOMOPICK_PARTS_FILAMENT:mode=="surfaces"?LABEL_TOMOPICK_PARTS_SURFACE:LABEL_TOMOPICK_PARTS_PARTS;
  j.outputNodes.push_back(Node(output+"particles.star",kind));
  j.outputNodes.push_back(Node(output+"optimisation_set.star",LABEL_TOMOPICK_OPTSET));
  if(preview){
   std::cout<<"\n@@RELIONDELUXE@@{\"browserTomo\":true,\"command\":\"Browser tomography picking in tomo_pick.html (no native command)\",\"commands\":[],\"jobName\":"<<quote(output)<<",\"inputs\":[{\"name\":"<<quote(input)<<",\"type\":"<<quote(j.joboptions["in_tomoset"].node_type)<<"}]}";return true;
  }
  mktree(output);j.write(output);
  id=p.addJob(j,PROC_RUNNING);
  touch(output+"RELIONDELUXE_BROWSER_TOMO");
  for(const auto &marker:{RELION_JOB_EXIT_SUCCESS,RELION_JOB_EXIT_FAILURE,RELION_JOB_EXIT_ABORTED,RELION_JOB_ABORT_NOW})std::remove((output+marker).c_str());
  p.write(DO_LOCK);locked=false;
  std::string error,warning;if(std::string(argv[4])!=""&&!p.setAliasJob(id,argv[4],error))warning=error;
  std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(output)<<",\"warning\":"<<quote(warning)<<"}";
 }catch(...){if(locked)p.write(DO_LOCK);throw;}
 return true;
}
