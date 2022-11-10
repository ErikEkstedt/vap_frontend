import path from 'path';
const fs = require('fs');

// Next.js API route support:
// https://nextjs.org/docs/api-routes/introduction
// https://vercel.com/guides/loading-static-file-nextjs-api-route
export default async function handler(req, res) {
  const outputDir = path.join(process.cwd(), 'data');

  if (req.query.filename) {
    const fileName = outputDir + '/' + req.query.filename + '.json';

    fs.readFile(fileName, 'utf8', function(err, data) {
      console.log('#################################################');
      console.log('OUTPUT: ' + req.query.filename);
      console.log('#################################################');

      if (err) {
        return res.status(404);
      }
      res.status(200).json(JSON.parse(data));
    });
  } else {
    res.status(404);
  }
}
