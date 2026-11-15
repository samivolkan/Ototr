import {db} from '../db/index.js';
export function detectSentimentDrops(){return db.prepare("SELECT store_id,AVG(CASE WHEN julianday(created_at)>=julianday('now','-7 days') THEN stars END) last7,AVG(CASE WHEN julianday(created_at)<julianday('now','-7 days') AND julianday(created_at)>=julianday('now','-37 days') THEN stars END) prev30 FROM reviews GROUP BY store_id HAVING prev30-last7>=0.3").all();}

