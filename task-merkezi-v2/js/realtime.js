export function subscribeToProject(client,projectId,onChange){
  const channel=client
    .channel(`task-project:${projectId}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'task_tasks',filter:`project_id=eq.${projectId}`},onChange)
    .on('postgres_changes',{event:'*',schema:'public',table:'task_assignees'},onChange)
    .subscribe();
  return ()=>client.removeChannel(channel);
}
