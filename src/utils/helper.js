const removeLocalFile = (localPath) => {
    fs.unlink(localPath, (err) => {
      if (err) console.log('Error while removing local files: ', err);
    });
  };




export  {
    removeLocalFile
}