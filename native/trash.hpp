// RelionDeLuxe checked deletion/restore planning. GPL-2.0-or-later.
// Mutations use RELION's PipeLine methods; metadata is read with MetaDataTable.
#include <regex>
#include <set>
#include <cerrno>
struct TrashPlan {
 std::vector<Process> jobs;
 std::vector<std::string> blocked;
 std::vector<bool> nodes, processes;
};
bool pathPresent(std::string path){while(!path.empty()&&path.back()=='/')path.pop_back();struct stat st;return lstat(path.c_str(),&st)==0;}
bool safeComponents(const std::string &path,bool missing=false){
 std::string current;std::istringstream in(path);std::string part;
 while(std::getline(in,part,'/')){if(part.empty())continue;if(part=="."||part=="..")return false;current+=part;
 struct stat st;if(lstat(current.c_str(),&st)){if(errno==ENOENT&&missing)return true;return false;}if(S_ISLNK(st.st_mode))return false;current+="/";}
 return true;
}
bool canonicalJob(const std::string &name){return std::regex_match(name,std::regex("[A-Za-z][A-Za-z0-9]*/job[0-9]+/"));}
bool safeAlias(const std::string &name){return name=="None" || (std::regex_match(name,std::regex("[A-Za-z][A-Za-z0-9]*/[A-Za-z0-9_.-]+/"))&&name.find("/../")==std::string::npos&&name.find("/./")==std::string::npos);}
std::string namesOf(const TrashPlan &plan){std::string s;for(auto &j:plan.jobs){if(!s.empty())s+=",";s+=j.name;}return s;}
void writePlan(const TrashPlan &plan){
 std::cout<<"\n@@RELIONDELUXE@@{\"jobs\":[";bool first=true;
 for(auto &j:plan.jobs){if(!first)std::cout<<",";first=false;std::cout<<"{\"name\":"<<quote(j.name)<<",\"alias\":"<<quote(j.alias)<<",\"status\":"<<quote(procstatus_type2label.at(j.status))<<"}";}
 std::cout<<"],\"blocked\":[";first=true;for(auto &b:plan.blocked){if(!first)std::cout<<",";first=false;std::cout<<quote(b);}std::cout<<"]}";
}
TrashPlan deletionPlan(PipeLine &p,const std::vector<int> &ids,bool recursive){
 TrashPlan plan;plan.nodes.resize(p.nodeList.size(),false);plan.processes.resize(p.processList.size(),false);
 auto includeProcess=[&](int id){
  std::vector<bool> nodes,processes;p.deleteJobGetNodesAndProcesses(id,false,nodes,processes);
  for(size_t i=0;i<nodes.size();i++)plan.nodes[i]=plan.nodes[i]||nodes[i];
  for(size_t i=0;i<processes.size();i++)plan.processes[i]=plan.processes[i]||processes[i];
  plan.processes[id]=true;
 };
 std::vector<int> pending;
 for(int id:ids){includeProcess(id);pending.push_back(id);}
 if(recursive){
  std::vector<bool> visited(p.processList.size(),false);
  while(!pending.empty()){
   int source=pending.back();pending.pop_back();if(visited[source])continue;visited[source]=true;
   // Walk every output edge. RELION's recursive helper can miss a branch in
   // larger dependency graphs, so build the downstream closure explicitly.
   for(int node:p.processList[source].outputNodeList)for(int dependent:p.nodeList[node].inputForProcessList)
    if(!plan.processes[dependent]){includeProcess(dependent);pending.push_back(dependent);}
  }
 }
 if(!recursive)for(size_t i=0;i<plan.nodes.size();i++)if(plan.nodes[i])for(auto dependent:p.nodeList[i].inputForProcessList)
  if(!plan.processes[dependent]){plan.blocked.push_back("Unselected downstream jobs depend on this selection. Include downstream jobs or select those jobs too.");break;}
 for(size_t i=0;i<plan.processes.size();i++)if(plan.processes[i]){
  auto &j=p.processList[i];plan.jobs.push_back(j);
  if(!canonicalJob(j.name)||!safeAlias(j.alias)||!supportedType(j.type))plan.blocked.push_back("Unsupported job or path: "+j.name);
  if(j.status==PROC_RUNNING)plan.blocked.push_back("Running job must stop first: "+j.name);
  if(!safeComponents(j.name))plan.blocked.push_back("Missing or symlinked job directory: "+j.name);
  if(!safeComponents("Trash/"+j.name,true))plan.blocked.push_back("Unsafe Trash path: "+j.name);
  if(pathPresent("Trash/"+j.name))plan.blocked.push_back("Trash already contains "+j.name+". Restore or relocate that copy first; it will not be overwritten.");
 }
 return plan;
}
TrashPlan deletionPlan(PipeLine &p,int id,bool recursive){return deletionPlan(p,std::vector<int>{id},recursive);}
TrashPlan restorationPlan(PipeLine &p,const std::string &manifest){
 ensure(std::regex_match(manifest,std::regex(R"(Trash/[A-Za-z][A-Za-z0-9]*/job[0-9]+/deleted_pipeline\.star)")),"Invalid Trash manifest path");
 ensure(safeComponents(manifest),"Missing or symlinked Trash manifest");
 MetaDataTable table;table.read(manifest,"pipeline_processes");TrashPlan plan;std::set<std::string> seen;
 FOR_ALL_OBJECTS_IN_METADATA_TABLE(table){
  std::string name,alias,label,status;int type,st;
  ensure(table.getValue(EMDL_PIPELINE_PROCESS_NAME,name)&&table.getValue(EMDL_PIPELINE_PROCESS_ALIAS,alias),"Incomplete Trash metadata");
  if(table.containsLabel(EMDL_PIPELINE_PROCESS_TYPE_LABEL)){
   ensure(table.getValue(EMDL_PIPELINE_PROCESS_TYPE_LABEL,label)&&table.getValue(EMDL_PIPELINE_PROCESS_STATUS_LABEL,status),"Incomplete Trash job type/status");
   type=get_proc_type(label);ensure(procstatus_label2type.count(status),"Unknown status in Trash");st=procstatus_label2type.at(status);
  }else{ensure(table.getValue(EMDL_PIPELINE_PROCESS_TYPE,type)&&table.getValue(EMDL_PIPELINE_PROCESS_STATUS,st),"Incomplete legacy Trash metadata");label=get_proc_label(type);}
  ensure(canonicalJob(name)&&safeAlias(alias)&&supportedType(type)&&procstatus_type2label.count(st),"Unsupported or unsafe job in Trash metadata");
  ensure(seen.insert(name).second,"Duplicate job in Trash metadata");plan.jobs.push_back(Process(name,label,type,st,alias));
  if(st==PROC_RUNNING)plan.blocked.push_back("Trash metadata marks a job as running: "+name);
  if(p.findProcessByName(name)>=0||pathPresent(name))plan.blocked.push_back("Restore destination already exists: "+name);
  if(!safeComponents(name,true)||!safeComponents("Trash/"+name))plan.blocked.push_back("Missing or symlinked directory: "+name);
  if(alias!="None"&&(p.findProcessByAlias(alias)>=0||pathPresent(alias)))plan.blocked.push_back("Alias already exists: "+alias);
 }
 ensure(!plan.jobs.empty(),"Trash manifest contains no jobs");
 // Validate inputs before invoking upstream import. The deletion manifest can
 // refer to inputs still owned by the active pipeline; they must be reattached.
 MetaDataTable edges;edges.read(manifest,"pipeline_input_edges");
 FOR_ALL_OBJECTS_IN_METADATA_TABLE(edges){std::string node,job;edges.getValue(EMDL_PIPELINE_EDGE_FROM,node);edges.getValue(EMDL_PIPELINE_EDGE_PROCESS,job);
  if(seen.count(job)&&p.findNodeByName(node)<0){bool restoredOutput=false;for(auto &j:plan.jobs)if(node.compare(0,j.name.size(),j.name)==0)restoredOutput=true;
   if(!restoredOutput)plan.blocked.push_back("Upstream input node is absent. Restore its producer first: "+node);
  }
 }
 return plan;
}
void restoreJobs(PipeLine &p,const std::string &manifest,const TrashPlan &plan){
 // Preserve input edges before RELION moves the manifest along with the job.
 MetaDataTable edges;edges.read(manifest,"pipeline_input_edges");
 p.undeleteJob(manifest);
 for(auto &j:plan.jobs)ensure(pathPresent(j.name)&&!pathPresent("Trash/"+j.name),"RELION could not move all job directories. Inspect the project before retrying.");
 // RELION's mini-pipeline import ignores input edges whose nodes were not
 // deleted. Reattach those edges via its public API under its normal lock.
 p.read(DO_LOCK,"RelionDeLuxe restore input edges");
 FOR_ALL_OBJECTS_IN_METADATA_TABLE(edges){std::string name,job;edges.getValue(EMDL_PIPELINE_EDGE_FROM,name);edges.getValue(EMDL_PIPELINE_EDGE_PROCESS,job);
  int proc=p.findProcessByName(job),node=p.findNodeByName(name);
  if(proc>=0&&node>=0){Node n=p.nodeList[node];p.addNewInputEdge(n,proc);}
 }
 p.write(DO_LOCK);
 // Keep the consumed manifest as history without advertising it as a new
 // deletion group if this restored job is later deleted with an ancestor.
 std::string restored=manifest.substr(6),archive=restored+".restored";
 for(unsigned i=1;pathPresent(archive);++i)archive=restored+".restored."+std::to_string(i);
 ensure(rename(restored.c_str(),archive.c_str())==0,"Jobs restored, but could not archive the consumed Trash manifest. Inspect the project before another deletion.");
}
