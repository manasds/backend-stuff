import { emailQueue } from "./queue";

async function main(){
    const job = await emailQueue.add("welcome-email" , {
        to : "user@example.com" ,
        name : "John Doe" ,
    }) ;
    console.log(`Job added: ${job.id}`);
    await emailQueue.close();
}

main();