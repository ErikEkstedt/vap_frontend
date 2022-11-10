import path from 'path';
const fs = require('fs')

// returns the names of all wav-files in dataDir
export default async function handler(req, res) {
  const dataDir = path.join(process.cwd(), 'data');

  let files = []
  fs.readdirSync(dataDir).forEach(file => {
    if (file.endsWith('.wav')) {
      files.push(file.replace(".wav", ""))
    }
  });

  //Return the content of the data file in json format
  res.status(200).json(files);
}

