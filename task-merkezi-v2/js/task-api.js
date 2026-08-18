export function createTaskApi(client){
  const table=name=>client.from(name);

  return {
    currentUser:()=>client.rpc('task_current_user_context'),
    listProjects:()=>table('task_projects')
      .select('id,branch_id,name,description,status,target_date,progress_percent,created_at')
      .is('archived_at',null)
      .order('created_at',{ascending:true}),
    getProject:id=>table('task_projects').select('*').eq('id',id).single(),
    createProjectFromTemplate:args=>client.rpc('create_task_project_from_template',args),
    listCategories:projectId=>table('task_categories')
      .select('id,project_id,name,description,sort_order')
      .eq('project_id',projectId)
      .is('archived_at',null)
      .order('sort_order',{ascending:true}),
    listMembers:projectId=>client.rpc('list_task_project_members',{target_project_id:projectId}),
    listManagedUsers:projectId=>client.rpc('list_task_project_users',{target_project_id:projectId}),
    listTasks:projectId=>table('task_tasks')
      .select('id,project_id,category_id,title,description,status,priority,due_at,requires_approval,requires_evidence,sort_order,created_by,created_at,updated_at,task_assignees(user_id)')
      .eq('project_id',projectId)
      .is('archived_at',null)
      .order('sort_order',{ascending:true})
      .limit(500),
    getTask:id=>table('task_tasks')
      .select('*,task_assignees(*),task_checklist_items(*),task_comments(*),task_attachments(*),task_approvals(*)')
      .eq('id',id)
      .single(),
    createTaskForProject:args=>client.rpc('create_task_for_project',args),
    updateTaskForProject:args=>client.rpc('update_task_for_project',args),
    updateProjectUser:args=>client.rpc('update_task_project_user',args),
    createProjectUser:async payload=>{
      const result=await client.functions.invoke('task-user-admin',{body:{action:'create',...payload}});
      if(!result.error)return result;
      let message=result.error.message||'Kullanıcı oluşturulamadı.';
      try{
        const body=await result.error.context?.json();
        if(body?.error)message=body.error;
      }catch{/* Keep the safe fallback message. */}
      return {data:null,error:{...result.error,message}};
    },
    updateTask:(id,expectedUpdatedAt,patch)=>client.rpc('update_task_with_version',{
      target_task_id:id,
      expected_updated_at:expectedUpdatedAt,
      patch
    }),
    archiveTask:(id,expectedUpdatedAt)=>client.rpc('archive_task_for_project',{
      target_task_id:id,
      expected_updated_at:expectedUpdatedAt
    }),
    assignUser:(taskId,userId)=>table('task_assignees').insert({task_id:taskId,user_id:userId}).select().single(),
    removeAssignee:(taskId,userId)=>table('task_assignees').delete().eq('task_id',taskId).eq('user_id',userId),
    addChecklistItem:payload=>table('task_checklist_items').insert(payload).select().single(),
    toggleChecklistItem:(id,isCompleted)=>table('task_checklist_items').update({is_completed:isCompleted}).eq('id',id).select().single(),
    addComment:payload=>table('task_comments').insert(payload).select().single(),
    uploadAttachment:payload=>table('task_attachments').insert(payload).select().single(),
    requestApproval:(taskId,comment='')=>client.rpc('request_task_approval',{target_task_id:taskId,request_comment:comment}),
    approveTask:(taskId,comment='')=>client.rpc('approve_task',{target_task_id:taskId,review_comment:comment}),
    rejectTask:(taskId,comment)=>client.rpc('reject_task',{target_task_id:taskId,review_comment:comment})
  };
}
