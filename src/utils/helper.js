import fs from 'fs'

const removeLocalFile = (localPath) => {
    fs.unlink(localPath, (err) => {
      if (err) console.log('Error while removing local files: ', err);
    });
  };


  const getMongoosePaginationOptions = ({
    page = 1,
    limit = 10,
    customLabels,
  }) => {
    return {
      page: Math.max(page, 1),
      limit: Math.max(limit, 1),
      pagination: true,
      customLabels: {
        pagingCounter: 'serialNumberStartFrom',
        ...customLabels,
      },
    };
  };

export  {
    removeLocalFile,
    getMongoosePaginationOptions
}