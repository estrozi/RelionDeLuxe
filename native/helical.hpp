// Register an add-on job using the official External type and pipeline APIs.
bool helicalAction(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action!="helical-preview"&&action!="helical-submit")return false;
 ensure(argc>3,"Expected settings and existing job");
 RelionJob j;bool cont;ensure(j.read(argv[2],cont,true)&&j.type==PROC_EXTERNAL,"Expected External settings");
 j.joboptions["in_part"].node_type="Image2DGroupMetadata.star.relion";
 std::string existing=argv[3],error;int id=existing.empty()?-1:p.findProcessByName(existing);
 ensure(existing.empty()||(id>=0&&p.processList[id].type==PROC_EXTERNAL&&existing.find("InitialModelHelical/job")==0),"Invalid existing helical job");
 if(id>=0)ensure(p.processList[id].status!=PROC_RUNNING,"Cannot resubmit a running job");
 std::string output=existing.empty()?"InitialModelHelical/job"+integerToString(p.job_counter,3)+"/":existing;
 std::vector<std::string> commands;std::string final;
 ensure(j.getCommands(output,commands,final,false,p.job_counter,error),error);
 if(action=="helical-preview"){
  std::string cmd="`which relion_helix_inimodel2d` --i "+j.joboptions["in_part"].value+" --angpix "+j.joboptions["param1_value"].value+" --mask_diameter "+j.joboptions["param2_value"].value+" --j "+j.joboptions["nr_threads"].value+" --crossover_distance "+j.joboptions["param3_value"].value+" --o "+output+"initial_model --iter 1 --sym 1 --pipeline_control "+output;
  std::cout<<"\n@@RELIONDELUXE@@{\"command\":"<<quote(cmd)<<",\"commands\":["<<quote(cmd)<<"]}";return true;
 }
 ensure(argc==6,"Expected action and alias");std::string mode=argv[4];ensure(mode=="run"||mode=="schedule"||mode=="continue","Invalid helical submission");
 bool scheduled=id>=0&&p.processList[id].status==PROC_SCHEDULED;
 if(id<0){
  // Allocate from RELION's counter while holding its normal pipeline lock.
  p.read(DO_LOCK,"Register helical External job");
  output="InitialModelHelical/job"+integerToString(p.job_counter,3)+"/";
  if(exists(output)){p.write(DO_LOCK);throw std::runtime_error("Helical job directory already exists");}
  if(!j.getCommands(output,commands,final,true,p.job_counter,error)){p.write(DO_LOCK);throw std::runtime_error(error);}
  j.label="relion.external.initialmodelhelical";
  j.outputNodes.push_back(Node(output+"initial_model_class001_rec3d.mrc","DensityMap.mrc"));
  j.write(output);id=p.addJob(j,PROC_SCHEDULED);p.write(DO_LOCK);scheduled=true;
 }
 // Existing-directory execution/scheduling is delegated unchanged to RELION.
 ensure(p.runJob(j,id,mode=="schedule",!scheduled,scheduled,error,false),error);
 std::string warning;if(std::string(argv[5])!=""&&!p.setAliasJob(id,argv[5],error))warning=error;
 std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(p.processList[id].name)<<",\"warning\":"<<quote(warning)<<"}";return true;
}
