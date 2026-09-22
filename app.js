import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getDatabase, onValue, ref, set } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

const members = ['순이', '필이', '상우', '웅이', '민이', '원이'];
const firebaseConfig = {
  apiKey: 'AIzaSyCJAIrZjJ6nt1tfdGmov2eTl-grlj_sojM',
  authDomain: 'heath-37315.firebaseapp.com',
  databaseURL: 'https://heath-37315-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'heath-37315',
  storageBucket: 'heath-37315.firebasestorage.app',
  messagingSenderId: '924162183473',
  appId: '1:924162183473:web:b582676ad48c1b30656010',
  measurementId: 'G-WP23QJTD73'
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const attendanceRef = ref(database, 'attendance');
const airServiceKey = 'd0f07c7b0b2b1e128da4617d440bb9cd551b0552cad6b3f137fbb3900138a4e7';
const kmaAuthKey = 'd2CcU-KkRL6gnFPipPS-Lw';
const airApiUrl = 'https://apis.data.go.kr/5590000/AirQualityService/getAirQualityList';
const kmaApiUrl = 'https://apihub.kma.go.kr/api/typ01/url/fct_afs_dl.php';

const today = new Date();
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = formatDate(today);
let attendance = {};

const $ = (selector) => document.querySelector(selector);

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(date) {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function renderMembers() {
  const todayMembers = attendance[selectedDate] || [];
  $('#memberGrid').innerHTML = members.map((member) => {
    const checked = todayMembers.includes(member);
    return `<button class="member-button${checked ? ' checked' : ''}" type="button" data-member="${member}" aria-pressed="${checked}">
      <span class="member-avatar">${member.slice(0, 1)}</span>
      <span class="member-name">${member}</span>
      <span class="member-state">${checked ? '참여 완료' : '참여하기'}</span>
    </button>`;
  }).join('');
  $('#attendanceCount').textContent = todayMembers.length;

  document.querySelectorAll('.member-button').forEach((button) => {
    button.addEventListener('click', () => toggleMember(button.dataset.member));
  });
}

async function toggleMember(member) {
  const current = new Set(attendance[selectedDate] || []);
  if (current.has(member)) current.delete(member);
  else current.add(member);
  const updated = members.filter((name) => current.has(name));
  if (updated.length) attendance[selectedDate] = updated;
  else delete attendance[selectedDate];
  renderMembers();
  renderCalendar();
  renderMonthlyStats();
  await saveAttendanceData(member);
}

async function saveAttendanceData(member) {
  try {
    const records = members.map((name) => ({
      date: selectedDate,
      name,
      check: attendance[selectedDate]?.includes(name) || false
    }));
    const monthKey = selectedDate.slice(0, 7);
    const report = buildMonthlyReport(monthKey);
    await Promise.all([
      set(ref(database, `attendance/${selectedDate}`), records),
      set(ref(database, `monthlyReports/${monthKey}`), report)
    ]);
    $('#savedMessage').textContent = `${member}님의 출석과 이달의 리포트를 Firebase에 저장했어요.`;
  } catch (error) {
    console.error('Firebase attendance save failed:', error);
    const reason = error?.code === 'PERMISSION_DENIED' ? 'Database Rules에서 쓰기 권한을 허용해주세요.' : '인터넷 연결과 Firebase 설정을 확인해주세요.';
    $('#savedMessage').textContent = `Firebase 저장 실패: ${reason}`;
  }
  window.setTimeout(() => { $('#savedMessage').textContent = ''; }, 2500);
}

function subscribeToAttendance() {
  onValue(attendanceRef, (snapshot) => {
    const records = snapshot.val() || {};
    attendance = Object.entries(records).reduce((result, [date, names]) => {
      const checkedNames = Array.isArray(names)
        ? names.filter((record) => record?.check === true).map((record) => record.name).filter(Boolean)
        : Object.values(names || {})
          .filter((record) => record?.check === true)
          .map((record) => record.name)
          .filter(Boolean);
      if (checkedNames.length) result[date] = checkedNames;
      return result;
    }, {});
    renderMembers();
    renderCalendar();
    renderMonthlyStats();
  }, () => {
    $('#savedMessage').textContent = 'Firebase 출석 기록을 불러오지 못했어요.';
  });
}

function renderMonthlyStats() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const counts = Object.entries(attendance)
    .filter(([date]) => date.startsWith(monthPrefix))
    .reduce((result, [, names]) => {
      names.forEach((name) => { result[name] = (result[name] || 0) + 1; });
      return result;
    }, {});
  const ordered = members.map((name) => ({ name, count: counts[name] || 0 }));
  const bestCount = Math.max(...ordered.map(({ count }) => count));
  const bestMembers = ordered.filter(({ count }) => count === bestCount);
  const leastCount = Math.min(...ordered.map(({ count }) => count));
  const leastMembers = ordered.filter(({ count }) => count === leastCount);
  $('#monthLabel').textContent = `${year}년 ${month + 1}월`;
  $('#bestMember').textContent = bestCount ? bestMembers.map(({ name }) => name).join(', ') : '아직 기록 없음';
  $('#bestCount').textContent = `${bestCount}회 참여`;
  $('#lowMember').textContent = leastMembers.map(({ name }) => name).join(', ');
  $('#lowCount').textContent = `${leastCount}회 참여`;
}

function buildMonthlyReport(monthKey) {
  const counts = Object.entries(attendance)
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((result, [, names]) => {
      names.forEach((name) => { result[name] = (result[name] || 0) + 1; });
      return result;
    }, {});
  const ordered = members.map((name) => ({ name, count: counts[name] || 0 }));
  const bestCount = Math.max(...ordered.map(({ count }) => count));
  const leastCount = Math.min(...ordered.map(({ count }) => count));
  return {
    month: monthKey,
    bestMember: ordered.filter(({ count }) => count === bestCount).map(({ name }) => name),
    bestCount,
    lowMember: ordered.filter(({ count }) => count === leastCount).map(({ name }) => name),
    lowCount: leastCount,
    updatedAt: new Date().toISOString()
  };
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  $('#calendarTitle').textContent = `${year}.${String(month + 1).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push('<div class="day-cell empty"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDate(new Date(year, month, day));
    const names = attendance[dateKey] || [];
    const isToday = dateKey === formatDate(today);
    const isSelected = dateKey === selectedDate;
    const dots = names.map(() => '<i class="day-dot"></i>').join('');
    cells.push(`<button class="day-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" type="button" data-date="${dateKey}">
      <span class="day-number">${day}</span><span class="day-dots">${dots}</span>
    </button>`);
  }
  $('#calendarGrid').innerHTML = cells.join('');
  document.querySelectorAll('.day-cell[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => {
      selectedDate = cell.dataset.date;
      renderCalendar();
      renderMembers();
      renderDayDetail();
      openDayModal(selectedDate);
    });
  });
  renderDayDetail();
}

function renderDayDetail() {
  const names = attendance[selectedDate] || [];
  const date = new Date(`${selectedDate}T00:00:00`);
  const detailText = names.length ? `${displayDate(date)} · ${names.join(', ')} 참여` : `${displayDate(date)} · 참여 기록이 없습니다.`;
  $('#dayDetail').innerHTML = `<span class="detail-dot"></span><span>${detailText}</span>`;
}

function openDayModal(dateKey) {
  const names = attendance[dateKey] || [];
  const date = new Date(`${dateKey}T00:00:00`);
  $('#modalDate').textContent = displayDate(date);
  $('#modalSummary').textContent = names.length ? `${names.length}명 참여` : '참여 기록이 없습니다.';
  $('#modalMembers').innerHTML = names.length
    ? names.map((name) => `<span class="modal-member">${name}</span>`).join('')
    : '<p class="modal-empty">이날 출석체크한 회원이 없습니다.</p>';
  $('#dayModal').showModal();
}

function getForecastDate() {
  const current = new Date();
  const forecastDate = new Date(current);
  if (current.getHours() < 6) forecastDate.setDate(forecastDate.getDate() - 1);
  return `${forecastDate.getFullYear()}${String(forecastDate.getMonth() + 1).padStart(2, '0')}${String(forecastDate.getDate()).padStart(2, '0')}`;
}

async function loadAirQuality() {
  try {
    const now = new Date();
    const searchDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams({
      serviceKey: airServiceKey,
      pageNo: '1',
      numOfRows: '1',
      searchDate,
      dataType: 'JSON'
    });
    const url = `${airApiUrl}?${params}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`air ${response.status}`);
    const data = await response.json();
    const item = data?.response?.body?.items?.[0];
    const value = item?.pm10Value;
    if (!value) throw new Error('PM10 value missing');
    const pm = Number.parseInt(value, 10);
    const level = pm <= 30 ? ['좋음', 20] : pm <= 80 ? ['보통', 55] : pm <= 150 ? ['나쁨', 82] : ['매우 나쁨', 100];
    $('#pmValue').textContent = pm;
    $('#airBadge').textContent = level[0];
    $('#airMeter').style.width = `${level[1]}%`;
    $('#airNote').textContent = '양주 미세먼지 API · PM10 기준';
  } catch (error) {
    $('#airNote').textContent = '대기정보를 불러오지 못했어요. 잠시 후 다시 확인해주세요.';
    $('#airBadge').textContent = '연결 대기';
  }
}

function parseWeatherText(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  const rows = lines
    .filter((line) => line.trim().startsWith('11B20304'))
    .map((line) => line.trim().split(/\s+/));
  const values = rows.find((row) => Number(row[12]) > -90);
  if (!values) return null;
  return { temperature: values[12], sky: values[14], rain: values[15] };
}

function renderWeather(temperature, sky, rain, note) {
  const skyNames = { DB01: '맑음', DB02: '구름 조금', DB03: '구름 많음', DB04: '흐림' };
  const rainNames = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };
  $('#temperature').textContent = `${Math.round(Number(temperature))}°`;
  $('#skyStatus').textContent = skyNames[sky] || '확인됨';
  $('#rainStatus').textContent = rainNames[rain] || '없음';
  $('#weatherIcon').textContent = sky === 'DB04' ? '☁' : sky === 'DB03' ? '◐' : '☀';
  $('#weatherNote').textContent = note;
}

async function loadOpenMeteoWeather() {
  const params = new URLSearchParams({
    latitude: '37.785',
    longitude: '127.045',
    current: 'temperature_2m,weather_code,precipitation',
    timezone: 'Asia/Seoul'
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`fallback weather ${response.status}`);
  const current = (await response.json()).current;
  const sky = current.weather_code === 0 ? 'DB01' : current.weather_code <= 3 ? 'DB03' : 'DB04';
  const rain = current.precipitation > 0 ? 1 : 0;
  renderWeather(current.temperature_2m, sky, rain, '양주 현재 날씨 · 대체 API');
}

async function loadWeather() {
  try {
    const forecastDate = getForecastDate();
    const url = `${kmaApiUrl}?reg=11B20304&tmfc1=${forecastDate}0000&tmfc2=${forecastDate}2359&disp=0&help=0&authKey=${kmaAuthKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`weather ${response.status}`);
    const text = await response.text();
    const parsed = response.headers.get('content-type')?.includes('json') ? await JSON.parse(text) : parseWeatherText(text);
    const raw = JSON.stringify(parsed || text);
    const temperature = parsed?.temperature || raw.match(/(?:ta|temp|temperature)[^\d-]*(-?\d+(?:\.\d+)?)/i)?.[1];
    const skyCode = parsed?.sky || raw.match(/(?:sky|wf)[^\d]*(\d)/i)?.[1];
    const rainCode = parsed?.rain || raw.match(/(?:pty|rain)[^\d]*(\d)/i)?.[1];
    if (!temperature) throw new Error('temperature missing');
    renderWeather(temperature, skyCode, rainCode, `기상청 단기 육상정보 · ${forecastDate} 발표`);
  } catch (error) {
    try {
      await loadOpenMeteoWeather();
    } catch {
      $('#weatherNote').textContent = '기상정보를 불러오지 못했어요. 잠시 후 다시 확인해주세요.';
    }
  }
}

function setup() {
  $('#todayLabel').textContent = displayDate(today);
  $('#closeDayModal').addEventListener('click', () => $('#dayModal').close());
  $('#dayModal').addEventListener('click', (event) => {
    if (event.target === $('#dayModal')) $('#dayModal').close();
  });
  $('#prevMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); renderMonthlyStats(); });
  $('#nextMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); renderMonthlyStats(); });
  renderMembers();
  renderCalendar();
  renderMonthlyStats();
  subscribeToAttendance();
  loadAirQuality();
  loadWeather();
}

setup();


