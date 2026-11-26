// A continuation may read another job's optimiser and write into a new directory.
// Register it directly as a native refinement/classification Scheduled process;
// the stock scheduler honours the saved _rlnJobIsContinue flag.
void continuationInput(RelionJob &j){
 if(j.is_continue&&j.type==PROC_DYNAMIGHT){const std::string cp=j.joboptions["fn_checkpoint"].value;if(!cp.empty()){j.inputNodes.push_back(Node(cp,"DynaMightCheckpoint.pth"));const auto at=cp.find("forward_deformations/");if(at!=std::string::npos)j.inputNodes.push_back(Node(cp.substr(0,at)+"RELION_JOB_EXIT_SUCCESS","DynaMightPhaseSuccess"));}return;}
 if(!j.is_continue||!(j.type==PROC_3DAUTO||j.type==PROC_3DCLASS))return;
 const std::string checkpoint=j.joboptions["fn_cont"].value;
 if(checkpoint.empty())return;
 for(auto &n:j.inputNodes)if(n.name==checkpoint)return;
 j.inputNodes.push_back(Node(checkpoint,j.type==PROC_3DAUTO?LABEL_REFINE3D_OPT:LABEL_CLASS3D_OPT));
}
bool cloneContinuationAction(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action!="clone-preview"&&action!="clone-schedule")return false;
 ensure(argc==5,"Expected settings, source and target for clone continuation");
 const std::string source=argv[3],target=argv[4];
 ensure(canonicalJob(source)&&canonicalJob(target)&&source!=target,"Invalid clone paths");
 bool locked=false;
 try{
  if(action=="clone-schedule"){p.read(DO_LOCK,"RelionDeLuxe clone continuation");locked=true;}
  RelionJob j;bool cont;ensure(j.read(argv[2],cont,true),"Cannot read clone settings");
  ensure(!j.is_tomo&&(j.type==PROC_3DAUTO||j.type==PROC_3DCLASS||j.type==PROC_DYNAMIGHT),"Unsupported clone job type");
  const bool dyna=j.type==PROC_DYNAMIGHT;
  const std::string prefix=dyna?"DynaMight/":j.type==PROC_3DAUTO?"Refine3D/":"Class3D/";
  ensure(source.find(prefix)==0&&target.find(prefix)==0,"Clone type and directories disagree");
  const int number=std::stoi(target.substr(target.find("/job")+4)),sourceNumber=std::stoi(source.substr(source.find("/job")+4));
  ensure(number>=p.job_counter&&sourceNumber<number,"Invalid clone numbering");
  ensure(p.findProcessByName(target)<0&&!pathPresent(target)&&!pathPresent("Trash/"+target)&&safeComponents(target,true),"Clone destination exists or is unsafe");
  const std::string checkpoint=j.joboptions[dyna?"fn_checkpoint":"fn_cont"].value;
  ensure(checkpoint.find(source)==0&&std::regex_match(checkpoint.substr(source.size()),std::regex(dyna?"forward_deformations/checkpoints/[A-Za-z0-9_.-]+\\.pth":"run_it[0-9]+_optimiser\\.star")),"Clone checkpoint must belong to its source job");
  const std::string alias="CloneContJob"+source.substr(source.find("job")+3);
  const std::string aliasName=prefix+alias;
  ensure(p.findProcessByAlias(aliasName)<0&&!pathPresent(aliasName),"Clone alias already exists");
  if(action=="clone-schedule"){
   ensure(number==p.job_counter,"Pipeline changed; preview the clone again");
   int sourceId=p.findProcessByName(source);
   ensure(sourceId>=0&&p.processList[sourceId].type==j.type,"Missing clone source");
   ensure(p.processList[sourceId].status==PROC_SCHEDULED||p.processList[sourceId].status==PROC_FINISHED_SUCCESS,"Clone source must be Scheduled or Succeeded");
   ensure(safeComponents(source)&&safeComponents(source+"job.star"),"Unsafe clone source");
  }
  j.is_continue=true;std::string output=target,error,final;std::vector<std::string> commands;
  ensure(j.getCommands(output,commands,final,action=="clone-schedule",number,error),error);
  continuationInput(j);
  std::string warning;
  if(action=="clone-schedule"){
   if(dyna){
    ensure(!j.joboptions["do_visualize"].getBoolean()&&(j.joboptions["do_inverse"].getBoolean()!=j.joboptions["do_reconstruct"].getBoolean()),"Choose one computational DynaMight continuation task");
    char *cwd=realpath(".",NULL);ensure(cwd!=NULL,"Cannot resolve project directory");std::string absolute(cwd);free(cwd);
    std::vector<std::string> dirs={"forward_deformations"};if(j.joboptions["do_reconstruct"].getBoolean())dirs.push_back("inverse_deformations");
    for(const auto &dir:dirs){ensure(!pathPresent(target+dir),"Clone results destination already exists");ensure(symlink((absolute+"/"+source+dir).c_str(),(target+dir).c_str())==0,"Cannot link DynaMight source results");}
   }
   j.write(target);int id=p.addJob(j,PROC_SCHEDULED);p.write(DO_LOCK);locked=false;
   std::string bareAlias=alias.substr(0,alias.size()-1);
   if(!p.setAliasJob(id,bareAlias,error))warning=error;
  }
  std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(target)<<",\"jobName\":"<<quote(target)<<",\"warning\":"<<quote(warning)<<",\"command\":"<<quote(final)<<",\"commands\":[";bool first=true;
  for(auto &c:commands){if(!first)std::cout<<",";first=false;std::cout<<quote(c);}std::cout<<"],\"inputs\":[";first=true;
  for(auto &n:j.inputNodes){if(!first)std::cout<<",";first=false;std::cout<<"{\"name\":"<<quote(n.name)<<",\"type\":"<<quote(n.type)<<"}";}std::cout<<"]}";
  return true;
 }catch(...){if(locked)p.write(DO_LOCK);throw;}
}
