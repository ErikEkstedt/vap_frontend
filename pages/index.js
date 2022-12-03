import { useEffect, useState } from 'react';
import VAP from '../components/vapWavesurferClass';

import { Box, Container, Flex, Heading } from '@chakra-ui/react';

import { Button } from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';
/* import { Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react'; */
/* import { ChevronDownIcon } from '@chakra-ui/icons'; */

/* const audioAPI = '/api/audio'; */
/* const outputAPI = '/api/output'; */

// python backend
// Reroute /api/python paths see next.config
const audioAPI = '/api/python/audio';
const outputAPI = '/api/python/output';

export default function IndexPage() {
  const [files, setFiles] = useState([]);
  const [fileOptions, setFileOptions] = useState([]);
  const [urls, setURLS] = useState({});
  const [curFile, setCurFile] = useState('');
  const [vap, setVAP] = useState(null);
  const [maxTopk, setMaxTopK] = useState(10);

  // Possible files
  useEffect(() => {
    fetch('/api/python/files')
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((files) => {
        setFiles(files);
        updateVAP(files[0].name);
        console.log('name: ' + files[0].name);
        setCurFile(files[0].name);

        let options = [];
        files.forEach((file) => {
          options.push(
            <option value={file.name} key={file.name}>
              {' '}
              {file.name}{' '}
            </option>
          );
        });
        setFileOptions(options);
      });
  }, []);

  const getURLs = (filename) => {
    return {
      audioURL: audioAPI + '?filename=' + filename + '-topk=' + maxTopk,
      dataURL: outputAPI + '?filename=' + filename + '-topk=' + maxTopk,
    };
  };

  const updateVAP = (filename) => {
    const paths = getURLs(filename);
    setCurFile(filename);
    setURLS(paths);
    console.log('Audio: ' + paths.audioURL);
    console.log('Data: ' + paths.dataURL);
    setVAP(
      <VAP
        audioURL={paths.audioURL}
        dataURL={paths.dataURL}
        filename={filename}
        maxTopk={maxTopk}
        key={filename}
      />
    );
  };

  return (
    <Box>
      <Flex m={2} as="nav" wrap="wrap" css={{ backdropFilter: 'blur(10px)' }}>
        <Container
          display="flex"
          align="center"
          wrap="wrap"
          maxW={900}
          justify="space-between"
        >
          <Flex align="center" mr={5}>
            <Heading as="h1" size="lg" letterSpacing={'tighter'}>
              VAP
            </Heading>
          </Flex>
          <Select
            value={curFile}
            onChange={(e) => {
              updateVAP(e.target.value);
            }}
          >
            {fileOptions}
          </Select>
        </Container>
      </Flex>
      {vap}
    </Box>
  );
}
