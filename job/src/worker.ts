import { Worker } from "bullmq"; 
import { connection } from "./queue";

const worker = new Worker(
    "emails" ,
    async (job) => {
        console.log(`Processing job ${job.id}` , job.data);
        await new Promise(r => setTimeout(r,3000)) ;
        console.log(`Done sending to ${job.data.to}`) ;
    } ,
    {connection}
);

worker.on("completed" , (job) => console.log(`${job.id} completed`)) ;
worker.on("failed" , (job ,err) => console.log(`${job?.id} failed` , err.message))
