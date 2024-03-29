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
  const [sessionNames, setSessionNames] = useState([]); // list of session names
  const [sessionSelection, setSessionSelection] = useState([]); // list of <option> elements
  const [currentSession, setCurrentSession] = useState('');
  const [urls, setURLS] = useState({});
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
      .then((sessions) => {
        setSessionNames(sessions);
        let options = [];
        sessions.forEach((file) => {
          options.push(
            <option value={file} key={file}>
              {file}
            </option>
          );
        });
        setSessionSelection(options);
      });
  }, []);

  const getURLs = (session) => {
    return {
      audioURL: audioAPI + '?filename=' + session + '-topk=' + maxTopk,
      dataURL: outputAPI + '?filename=' + session + '-topk=' + maxTopk,
    };
  };

  const updateVAP = (session) => {
    if (session === currentSession) {
      return;
    } else if (session === '') {
      setVAP(null);
      return;
    }

    const paths = getURLs(session);
    setCurrentSession(session);
    setURLS(paths);
    setVAP(
      <VAP
        audioURL={paths.audioURL}
        dataURL={paths.dataURL}
        filename={session}
        maxTopk={maxTopk}
        key={session}
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
            value={currentSession}
            onChange={(e) => {
              updateVAP(e.target.value);
            }}
          >
            {sessionSelection}
          </Select>
        </Container>
      </Flex>
      {vap}
    </Box>
  );
}
