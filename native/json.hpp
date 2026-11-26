// RelionDeLuxe JSON output helpers. GPL-2.0-or-later.
#pragma once
#include <iomanip>
std::string quote(const std::string &s) {
 std::ostringstream o; o << '"';
 for (unsigned char c:s) {switch(c){case '"':o<<"\\\"";break;case '\\':o<<"\\\\";break;case '\n':o<<"\\n";break;case '\r':o<<"\\r";break;case '\t':o<<"\\t";break;default:if(c<32)o<<"\\u"<<std::hex<<std::setw(4)<<std::setfill('0')<<(int)c<<std::dec;else o<<c;}}
 o<<'"';return o.str();
}
void writeSchema(RelionJob &j) {
 std::cout<<"{\"id\":"<<j.type<<",\"options\":[";bool first=true;
 for(auto &kv:j.joboptions){auto &v=kv.second;if(!first)std::cout<<",";first=false;
 std::cout<<"{\"key\":"<<quote(kv.first)<<",\"label\":"<<quote(v.label)<<",\"default\":"<<quote(v.value)<<",\"help\":"<<quote(v.helptext)<<",\"type\":"<<v.joboption_type<<",\"nodeType\":"<<quote(v.node_type)<<",\"nodeDepth\":"<<(v.joboption_type==3?v.node_type_depth:1)<<",\"pattern\":"<<quote(v.pattern)<<",\"choices\":[";
 bool f=true;for(auto &r:v.radio_options){if(!f)std::cout<<",";f=false;std::cout<<quote(r);}std::cout<<"]}";
 }std::cout<<"]}";
}
