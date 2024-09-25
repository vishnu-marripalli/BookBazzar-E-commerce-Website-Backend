import 'dotenv/config'

import Connect_DB from './db/config.js'
import { app,startApp } from './app.js'



(async () => {
    try {
      // connecting mongoDB database
      await Connect_DB();
  
      startApp();
  
      app.listen(process.env.PORT, () => {
        console.log(`🚝 Server is running at port ${process.env.PORT}`);
      });
    } catch (error) {
      console.error('Error Occur while starting the server : ' + error);
      process.exit(1);
    }
  })();