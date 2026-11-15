export function classifyReview(stars:number,text:string){const legal=/avukat|mahkeme|dava|tazminat/i.test(text);return {risk:legal?85:stars<=2?70:stars===3?30:5,routeTo:legal?'legal':null,requiresHuman:true,classification:legal?'legal_review':stars<=2?'critical':stars===3?'neutral':'positive'};}
export function localDraft(){return {text:'Geri bildiriminiz için teşekkür ederiz. Konuyu değerlendirmek için şubemizle iletişime geçebilirsiniz.',source:'local_template'};}

