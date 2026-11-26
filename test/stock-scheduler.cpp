#include "src/pipeliner.h"
int main(int argc,char **argv){if(argc!=2)return 2;PipeLine p;p.read(DONT_LOCK);p.runScheduledJobs("clone_test",argv[1],1,0,0,1);return 0;}
