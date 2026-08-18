export const state={
  session:null,
  user:null,
  projects:[],
  selectedProject:null,
  categories:[],
  members:[],
  managedUsers:[],
  tasks:[],
  filters:{scope:'all',search:'',status:'',category:'',assignee:''},
  visibleLimit:40,
  unsubscribe:null
};

export function resetState(){
  if(state.unsubscribe)state.unsubscribe();
  state.session=null;
  state.user=null;
  state.projects=[];
  state.selectedProject=null;
  state.categories=[];
  state.members=[];
  state.managedUsers=[];
  state.tasks=[];
  state.filters={scope:'all',search:'',status:'',category:'',assignee:''};
  state.visibleLimit=40;
  state.unsubscribe=null;
}
