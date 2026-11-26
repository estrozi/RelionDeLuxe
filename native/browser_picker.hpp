std::string browserCoordinateName(const FileName &mic,bool autopick=false){
 FileName pre,number,post;decomposePipelineSymlinkName(mic,pre,number,post);
 std::string relative=post.withoutExtension();
 while(!relative.empty()&&relative[0]=='/')relative.erase(0,1);
 ensure(!relative.empty()&&relative.find("../")==std::string::npos,"Unsafe micrograph coordinate path");
 return relative+(autopick?"_autopick.star":"_manualpick.star");
}
bool browserPickerSave(PipeLine &p,const std::string &action,int argc,char **argv){
 if(action!="browser-pick-save"&&action!="browser-pick-finish")return false;
 ensure(argc==(action=="browser-pick-save"?5:3),"Expected picking job and coordinates");std::string name=argv[2],error;int id=p.findProcessByName(name);
 ensure(id>=0&&(p.processList[id].type==PROC_MANUALPICK||p.processList[id].type==PROC_AUTOPICK)&&p.processList[id].status==PROC_RUNNING&&exists(name+"RELIONDELUXE_BROWSER_PICKING"),"Browser picking job is not running");
 RelionJob j;bool cont;ensure(j.read(name,cont,true),"Cannot read picking settings");const bool autopick=j.type==PROC_AUTOPICK;ensure(!autopick||j.joboptions["continue_manual"].getBoolean(),"Autopick is not in manual continuation mode");const std::string mappingName=autopick?"autopick.star":"manualpick.star";MetaDataTable mics,optics;mics.read(j.joboptions[autopick?"fn_input_autopick":"fn_in"].value,"micrographs");optics.read(j.joboptions[autopick?"fn_input_autopick":"fn_in"].value,"optics");ensure(mics.numberOfObjects()>0&&optics.numberOfObjects()>0,"Expected micrographs and optics");
 std::string changedMic,changedTarget;
 if(action=="browser-pick-save"){
  long row=std::stol(argv[3]);ensure(row>=0&&row<mics.numberOfObjects(),"Invalid micrograph row");MetaDataTable coords;coords.read(argv[4]);coords.setName("");FileName mic;mics.getValue(EMDL_MICROGRAPH_NAME,mic,row);std::string target=name+browserCoordinateName(mic,autopick);changedMic=mic;changedTarget=target;coords.write(target+".tmp");ensure(std::rename((target+".tmp").c_str(),target.c_str())==0,"Cannot save coordinates");
 }
 MetaDataTable previous;std::map<std::string,std::string> retained;if(exists(name+mappingName)){previous.read(name+mappingName,"coordinate_files");FOR_ALL_OBJECTS_IN_METADATA_TABLE(previous){FileName mic,coords;if(previous.getValue(EMDL_MICROGRAPH_NAME,mic)&&previous.getValue(EMDL_MICROGRAPH_COORDINATES,coords))retained[mic]=coords;}}
 const bool indexed=exists(name+mappingName);
 MetaDataTable mapping;mapping.setName("coordinate_files");
 for(long row=0;row<mics.numberOfObjects();row++){
  FileName mic;mics.getValue(EMDL_MICROGRAPH_NAME,mic,row);std::string target;
  if(mic==changedMic)target=changedTarget;
  else if(indexed){if(retained.count(mic))target=retained[mic];else if(mics.containsLabel(EMDL_MICROGRAPH_COORDINATES)){FileName original;mics.getValue(EMDL_MICROGRAPH_COORDINATES,original,row);target=original;}}
  else{
   target=name+browserCoordinateName(mic,autopick);
   if(!exists(target)){std::string legacy=name+"mic_"+integerToString(row+1,6)+"_manualpick.star";target=exists(legacy)?legacy:"";}
   if(target.empty()&&mics.containsLabel(EMDL_MICROGRAPH_COORDINATES)){FileName original;mics.getValue(EMDL_MICROGRAPH_COORDINATES,original,row);if(!original.empty()&&exists(original))target=original;}
  }
  if(!target.empty()){mapping.addObject();mapping.setValue(EMDL_MICROGRAPH_NAME,mic);mapping.setValue(EMDL_MICROGRAPH_COORDINATES,FileName(target));}
 }

 mapping.write(name+mappingName+".tmp");{std::ofstream out((name+"micrographs_selected.star.tmp").c_str());optics.setName("optics");mics.setName("micrographs");optics.write(out);mics.write(out);out.close();ensure(bool(out),"Cannot save micrograph metadata");}
 ensure(std::rename((name+mappingName+".tmp").c_str(),(name+mappingName).c_str())==0,"Cannot publish coordinate mapping");ensure(std::rename((name+"micrographs_selected.star.tmp").c_str(),(name+"micrographs_selected.star").c_str())==0,"Cannot publish micrographs");
 if(action=="browser-pick-finish"){ensure(p.markAsFinishedJob(id,error,false),error);touch(name+RELION_JOB_EXIT_SUCCESS);}
 std::cout<<"\n@@RELIONDELUXE@@{\"name\":"<<quote(name)<<"}";return true;
}
