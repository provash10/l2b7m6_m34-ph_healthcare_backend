import cron from 'node-cron';



export const deleteUnverifiedfieldDoctors = async () => {
    cron.schedule('*/2 * * * * *', () => {
    //prisma business => doctors delete
    //   console.log('running a task every minute');
    console.log("Doctor Delete")
});
}