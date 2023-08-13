import { useEffect, useState } from 'react';
import { Box, Container, Flex, Heading, Select } from '@chakra-ui/react';

/* import VAP from '../components/vapWavesurferClass'; */
import VAP from '../components/vapNew';

// python backend
// Reroute /api/python paths see next.config
const audioAPI = '/api/python/audio';
const outputAPI = '/api/python/output';

export default function IndexPage() {
  const [sessionNames, setSessionNames] = useState([]); // list of session names
  const [sessionSelection, setSessionSelection] = useState([]); // list of <option> elements
  const [currentSession, setCurrentSession] = useState('');
  const [urls, setURLS] = useState({ audioURL: '', dataURL: '' });
  const [vap, setVAP] = useState(null);
  const [maxTopk, setMaxTopK] = useState(10);
  const [data, setData] = useState(null);

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

  const fetchData = async (session) => {
    const urlPaths = getURLs(session);
    /* console.log('session: ', session); */
    /* console.log('urlPaths: ', urlPaths); */

    await fetch(urlPaths.dataURL)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw response;
      })
      .then((data) => {
        setData(data);
        setCurrentSession(session);
        setURLS(urlPaths);
      });
  };

  const updateVAP = (session) => {
    if (session === currentSession || session === '') {
      return;
    }
    fetchData(session);
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
      {urls.audioURL && (
        <VAP session={currentSession} audioURL={urls.audioURL} data={data} />
      )}
    </Box>
  );
}
