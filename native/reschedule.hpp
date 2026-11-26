// Exact-number scheduled copies; original jobs are trashed only after all copies exist.
bool rescheduleAction(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action=="reschedule-trash-plan"||action=="reschedule-trash"){
  ensure(argc==3,"Expected selected jobs");std::vector<int> ids;std::istringstream names(argv[2]);std::string name;std::set<int> selected;
  while(std::getline(names,name,',')){int id=p.findProcessByName(name);ensure(id>=0&&canonicalJob(name)&&selected.insert(id).second,"Invalid selection");ensure(p.processList[id].status==PROC_SCHEDULED,"Original is no longer Scheduled");ids.push_back(id);}
  ensure(!ids.empty(),"Empty selection");auto plan=deletionPlan(p,ids,false);
  plan.blocked.erase(std::remove(plan.blocked.begin(),plan.blocked.end(),"Unselected downstream jobs depend on this selection. Include downstream jobs or select those jobs too."),plan.blocked.end());
  for(size_t i=0;i<plan.nodes.size();i++)if(plan.nodes[i])for(auto dependent:p.nodeList[i].inputForProcessList)if(!selected.count(dependent)){
   int status=p.processList[dependent].status;
   if(status==PROC_RUNNING||status==PROC_SCHEDULED)plan.blocked.push_back("Unselected active/scheduled dependent: "+p.processList[dependent].name);
   else plan.nodes[i]=false; // Retain historical input nodes, now without a producer.
  }
  if(action=="reschedule-trash-plan"){writePlan(plan);return true;}
  ensure(plan.blocked.empty(),plan.blocked.empty()?"":plan.blocked.front());p.deleteNodesAndProcesses(plan.nodes,plan.processes);
  for(auto &job:plan.jobs)ensure(pathPresent("Trash/"+job.name)&&!pathPresent(job.name),"Trash operation incomplete; inspect project");
  std::cout<<"\n@@RELIONDELUXE@@{}";return true;
 }
 if(action!="reschedule-copy-plan"&&action!="reschedule-copy")return false;
 ensure(argc==5,"Expected source, destination and settings");
 std::string source=argv[2],destination=argv[3];
 ensure(canonicalJob(source)&&canonicalJob(destination),"Invalid job path");
 bool locked=false;
 try{
  if(action=="reschedule-copy"){p.read(DO_LOCK,"RelionDeLuxe reschedule copy");locked=true;}
  int id=p.findProcessByName(source);ensure(id>=0&&p.processList[id].status==PROC_SCHEDULED,"Source must still be Scheduled");
  ensure(safeComponents(source)&&safeComponents(source+"job.star")&&safeComponents(destination,true),"Unsafe job path");
  ensure(p.findProcessByName(destination)<0&&!pathPresent(destination)&&!pathPresent("Trash/"+destination),"Destination already exists");
  std::string prefix=source.substr(0,source.find('/'));
  ensure(destination.substr(0,destination.find('/'))==prefix,"Job type directory must be unchanged");
  int number=std::stoi(destination.substr(destination.find("/job")+4));
  ensure(number>=p.job_counter,"Destination number is below the current pipeline counter");
  for(auto &proc:p.processList)ensure(std::stoi(proc.name.substr(proc.name.find("/job")+4))!=number,"Job number already used");
  RelionJob j,settings;bool cont,other;ensure(j.read(source,cont,true)&&settings.read(argv[4],other,true),"Cannot read job settings");
  ensure(j.type==settings.type&&supportedJob(j)&&settings.is_tomo==j.is_tomo,"Unsupported job type");
  for(auto &kv:settings.joboptions)if(j.joboptions.count(kv.first))j.joboptions[kv.first].value=kv.second.value;
  bool helical=prefix=="InitialModelHelical"&&j.type==PROC_EXTERNAL;
  if(helical)j.joboptions["in_part"].node_type="Image2DGroupMetadata.star.relion";
  std::vector<std::string> commands;std::string final,error;
  ensure(j.getCommands(destination,commands,final,false,number,error),error);
  if(helical)j.outputNodes.push_back(Node(destination+"initial_model_class001_rec3d.mrc","DensityMap.mrc"));
  if(action=="reschedule-copy"){
   ensure(j.getCommands(destination,commands,final,true,number,error),error);
   if(helical)j.outputNodes.push_back(Node(destination+"initial_model_class001_rec3d.mrc","DensityMap.mrc"));
   j.write(destination);p.job_counter=number;p.addJob(j,PROC_SCHEDULED);p.write(DO_LOCK);locked=false;
  }
  std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(destination)<<",\"inputs\":[";bool first=true;
  for(auto &node:j.inputNodes){if(!first)std::cout<<",";first=false;std::cout<<quote(node.name);}
  std::cout<<"],\"outputs\":[";first=true;for(auto &node:j.outputNodes){if(!first)std::cout<<",";first=false;std::cout<<quote(node.name);}std::cout<<"]}";
  return true;
 }catch(...){if(locked)p.write(DO_LOCK);throw;}
}
