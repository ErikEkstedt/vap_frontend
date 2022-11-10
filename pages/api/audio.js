import path from 'path';
const fs = require('fs');

// Next.js API route support:
// https://nextjs.org/docs/api-routes/introduction
// https://vercel.com/guides/loading-static-file-nextjs-api-route
export default async function handler(req, res) {
  const audioDir = path.join(process.cwd(), 'data');

  if (req.query.filename) {
    const fileName = audioDir + '/' + req.query.filename + '.wav';
    console.log('#################################################');
    console.log('AUDIO: ' + req.query.filename);
    console.log('#################################################');
    let opStream = fs.createReadStream(fileName);
    opStream.pipe(res);
  } else {
    res.status(404);
  }
}
