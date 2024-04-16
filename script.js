const getSensorName = (sensorName) => sensorName
    .split(')')[0]
    .toLowerCase()
    .trim()
    .replace(/[(]/g, '')
    .replace(/[\s]/g, '_');

const spliceMultipleIndices = (arr, discardedColumnIndices) => {
  discardedColumnIndices.forEach(idx => arr.splice(idx, 1));
  return arr;
}


const readInterval = 100;

const handleLog = function(logData) {
  const defaultBlueColor = '#0000ff';
  const defaultGrayColor = '#edebeb';
  const defaultGreenColor = '#a9d70b';
  const defaultRedColor = '#ff0000';
  const defaultYellowColor = '#f9c802';
  const labelFontColor = '#555555';
  let currentRowIdx = 0
  let isPlaying = false;
  let lastRowIdx = 0;
  let playInterval;

  const $playbackSlider = $('#playback-slider');
  
  const discardedColumnIndices = [24, 23, 14, 12];
  const gauges = [];
  const gaugeValsObj = {
    'ignition_advance': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 90},
    'rpm': {'decimals': 0, levelColors: [defaultGreenColor, defaultGreenColor, defaultRedColor], 'maxVal': 6000},
    'auxinput': {'decimals': 0, levelColors: [defaultGreenColor], 'maxVal': 1},
    'afm_v': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 12},
    'dme_voltage_v': {'decimals': 2, levelColors: [defaultRedColor, defaultYellowColor, defaultGreenColor], 'maxVal': 15},
    'iat_f': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 200},
    'ect_f': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 250},
    'throttle_switch': {'decimals': 0, levelColors: [defaultBlueColor, defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 4},
    'icv_%': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 100},
    'fly_mark_errors': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 100},
    'fly_rpm_errors': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 100},
    'fly_tooth_count': {'decimals': 0, levelColors: [defaultRedColor, defaultYellowColor, defaultGreenColor], 'maxVal': 150},
    'nbo2_v': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 15},
    'fqs': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 7},
    'bap_psi': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 30},
    'map_psi': {'decimals': 2, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 30},
    'wbo2_afr': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 100},
    'wbo2_lamda': {'decimals': 0, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 100},
    'ign_dwell_ms': {'decimals': 1, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 50},
    'inj_pulse_ms': {'decimals': 1, levelColors: [defaultGreenColor, defaultYellowColor, defaultRedColor], 'maxVal': 20},
    'fuel_pump': {'decimals': 0, levelColors: [defaultGreenColor], 'maxVal': 1},
    'ac_comp': {'decimals': 0, levelColors: [defaultGreenColor], 'maxVal': 1}
  };

  const updateGauges = (sensorValues) => {
    sensorValues.forEach((value, idx) => {
      refreshVal = value;

      switch(value) {
        case 'OFF':
          refreshVal = 0; break;
        case 'ON':
        case 'Idle':
          refreshVal = 1; break;
        case 'Off Idle':
          refreshVal = 2; break;
        case 'Full Load':
          refreshVal = 3; break;
      }

      // update gauge
      gauges[idx].refresh(refreshVal);
    });
  }

  const startPlayInterval = (rows) => {
    isPlaying = true;
    const retInterval = setInterval(() => {
      if (currentRowIdx < rows.length) {
        const currentRow = rows[currentRowIdx++].replace(/\r/g, '').split(',');
        const timestamp = currentRow[0];
        let sensorValues = currentRow.slice(1);

        // string data removal
        sensorValues = spliceMultipleIndices(sensorValues, discardedColumnIndices);

        updateGauges(sensorValues);
        $playbackSlider.val(currentRowIdx);
      } else {
        clearInterval(retInterval);
        isPlaying = false;
      }
    }, readInterval);

    return retInterval;
  }

  const stopPlayInterval = () => {
    clearInterval(playInterval);
    isPlaying = false;
    return null;
  }

  const togglePlayInterval = (rows) => {
    playInterval = isPlaying ? stopPlayInterval() : startPlayInterval(rows);
  }

  const readCSV = async () => {
    // const response = await fetch(uploadedLog);
    // const data = (await response.text()).split('\n');
    
    const data = logData.split('\n');
    const headers = spliceMultipleIndices(data[0].replace(/"|\r|\./g, '').split(',').slice(1), discardedColumnIndices);
    const rows = data.slice(1);
    lastRowIdx = rows.length-1;

    $('.playback-begin').on('click', () => {
      currentRowIdx = 0;
    });

    $('.playback-start-pause').on('click', () => {
      togglePlayInterval(rows);
    });

    $('.playback-end').on('click', () => {
      currentRowIdx = lastRowIdx;
    });

    // playback slider setup and functionality
    $playbackSlider.prop('max', rows.length);
    $playbackSlider.on('input change', function(event) {
      currentRowIdx = this.value;
    });

    const $gaugesContainer = $('#gauges-container');
    for (let headerIdx in headers) {
      const gaugeID = getSensorName(headers[headerIdx]);

      $gaugesContainer.append(`<div id="${gaugeID}" class="200x160px gauge"></div>`)
      gauges[headerIdx] = new JustGage({
        id: gaugeID,
        value: 0,
        label: headers[headerIdx],
        labelFontColor: labelFontColor,
        levelColors: gaugeValsObj[gaugeID]['levelColors'],
        min: 0,
        max: gaugeValsObj[gaugeID]['maxVal'],
        decimals: gaugeValsObj[gaugeID]['decimals'],
        gaugeWidthScale: 0.6
      });
    }

    playInterval = startPlayInterval(rows);
  }

  $('#primary-content').show();
  readCSV();
}

window.onload = function() {
  // '133531928981442054.csv'
  $('#log-input').on('change', function(e) {
    const reader = new FileReader();

    reader.onload = function(event) {
      handleLog(event.target.result);
    };

    reader.readAsText(this.files[0]);
  });
}