// Save browser-selected rows using RELION's own metadata reader/writer.
bool browserSelectionSave(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action!="browser-select-save")return false;
 ensure(argc==4,"Expected job and selected original row indices");
 std::string name=argv[2],error;int id=p.findProcessByName(name);
 ensure(id>=0&&p.processList[id].type==PROC_CLASSSELECT&&p.processList[id].status==PROC_RUNNING,"Selection job is not running");
 ensure(exists(name+"RELIONDELUXE_BROWSER_SELECTION"),"Not a browser selection job");
 RelionJob j;bool cont;ensure(j.read(name,cont,true),"Cannot read selection settings");
 ensure(!j.joboptions["do_recenter"].getBoolean()&&!j.joboptions["do_regroup"].getBoolean(),"Recentring/regrouping require native selection");
 std::set<long> selected;std::istringstream input(argv[3]);std::string token;
 while(std::getline(input,token,',')){ensure(!token.empty()&&token.find_first_not_of("0123456789")==std::string::npos,"Invalid row index");selected.insert(std::stol(token));}
 ensure(!selected.empty(),"Select at least one image");
 MetaDataTable images,parts,optics,output,classes;std::string source,block,destination;bool model=!j.joboptions["fn_model"].value.empty();
 if(model){MetaDataTable opt;opt.read(j.joboptions["fn_model"].value,"optimiser_general");FileName fnmodel,fndata;ensure(opt.getValue(EMDL_OPTIMISER_MODEL_STARFILE,fnmodel)&&opt.getValue(EMDL_OPTIMISER_DATA_STARFILE,fndata),"Choose an optimiser STAR file");images.read(fnmodel,"model_classes");parts.read(fndata,"particles");optics.read(fndata,"optics");ensure(parts.numberOfObjects()>0&&optics.numberOfObjects()>0,"Expected particles and optics tables");destination="particles.star";block="particles";
 }else{bool mic=!j.joboptions["fn_mic"].value.empty();source=j.joboptions[mic?"fn_mic":"fn_data"].value;block=mic?"micrographs":"particles";destination=block+".star";images.read(source,block);optics.read(source,"optics");ensure(optics.numberOfObjects()>0,"Expected modern STAR optics table");}
 ensure(images.numberOfObjects()>0&&*selected.rbegin()<images.numberOfObjects(),"Selection no longer matches input rows");std::set<int> classIds;
 for(long row:selected){classes.addObject(images.getObject(row));int classId=row+1;if(images.containsLabel(EMDL_PARTICLE_CLASS))images.getValue(EMDL_PARTICLE_CLASS,classId,row);classIds.insert(classId);if(model)classes.setValue(EMDL_PARTICLE_CLASS,classId);}
 if(model){ensure(parts.containsLabel(EMDL_PARTICLE_CLASS),"Particles lack class numbers");FOR_ALL_OBJECTS_IN_METADATA_TABLE(parts){int c;parts.getValue(EMDL_PARTICLE_CLASS,c);if(classIds.count(c))output.addObject(parts.getObject());}}
 else output=classes;
 ensure(output.numberOfObjects()>0,"Selection contains no particles/images");output.setName(block);optics.setName("optics");
 std::string temp=name+destination+".browser-tmp";{std::ofstream out(temp.c_str());ensure(bool(out),"Cannot create output");optics.write(out);output.write(out);out.close();ensure(bool(out),"Cannot write output");}
 bool saveClasses=false;for(int n:p.processList[id].outputNodeList)if(p.nodeList[n].name==name+"class_averages.star")saveClasses=true;
 if(model&&saveClasses){classes.setName("");classes.write(name+"class_averages.star.browser-tmp");}
 ensure(std::rename(temp.c_str(),(name+destination).c_str())==0,"Cannot publish selected metadata");
 if(model&&saveClasses)ensure(std::rename((name+"class_averages.star.browser-tmp").c_str(),(name+"class_averages.star").c_str())==0,"Cannot publish classes");
 ensure(p.markAsFinishedJob(id,error,false),error);touch(name+RELION_JOB_EXIT_SUCCESS);
 {std::ofstream log((name+"run.out").c_str(),std::ios::app);log<<"Browser selection saved "<<selected.size()<<" selected images and "<<output.numberOfObjects()<<" output rows."<<std::endl;}
 std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(name)<<",\"count\":"<<output.numberOfObjects()<<"}";return true;
}
