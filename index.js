const ROOT = 'https://scrapbox.io';
const API_ROOT = `${ROOT}/api`;
const LINKS_PROJ_NAME = 'euthanasia-links';
const LOGS_PROJ_NAME = 'euthanasia-links-logs';

const TOTAL_CNT = 'ページ総数';
const ADDITION_CNT = '前回以降に追加されたページ数';
const APPROVAL_CNT = '前回以降に承認されたページ数';
const UNAPPROVAL_CNT = '未承認のページ数';

const LOG_FILE_NAME = 'log.json';
const i = (n) => ' '.repeat(n) ; // 任意の深さのインデント文字を返す

// 前回のログ
const prevLogPages = await fetch(`${API_ROOT}/pages/${LOGS_PROJ_NAME}/?limit=1`)
  .then(res => res.json())
  .then(data => data.pages);

// リンク集のページ情報
const pageList = await fetch(`${API_ROOT}/pages/${LINKS_PROJ_NAME}/?limit=1`)
  .then(res => res.json());

const body = [`code: ${LOG_FILE_NAME}`];
const log = [];
const errors = [];

// ログ用のjsonファイルを作成する
if (prevLogPages.length > 0) {
  const prevLog = await fetch(`${API_ROOT}/code/${LOGS_PROJ_NAME}/${encodeURIComponent(prevLogPages[0].title)}/${LOG_FILE_NAME}`)
    .then(res => res.json());
  const additionCnt = pageList.count - prevLog[TOTAL_CNT];
  
  log.push(
    `${i(3)}${`"${TOTAL_CNT}": ${pageList.count}`}`,
    `${i(3)}${`"${ADDITION_CNT}": ${additionCnt}`}`,
    `${i(3)}${`"${APPROVAL_CNT}": 0`}`,
    `${i(3)}${`"${UNAPPROVAL_CNT}": 0`}`,
  );

} else {
  log.push(
    `${i(3)}${`"${TOTAL_CNT}": ${pageList.count}`}`,
    `${i(3)}${`"${ADDITION_CNT}": ${pageList.count}`}`,
    `${i(3)}${`"${APPROVAL_CNT}": 0`}`,
    `${i(3)}${`"${UNAPPROVAL_CNT}": 0`}`,
  );
}

body.push(`${i(1)}{`, log.join(',\n'), `${i(1)}}`);

const now = new Date()
const [year, month, date, hour, min, sec] = [
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  now.getHours(),
  now.getMinutes(),
  now.getSeconds()
];

const ymd = `${year}/${month}/${date}`;
const title = encodeURIComponent(`${ymd} ${hour}:${min}:${sec} 時点のログ`);

// if (prevLogs[0]?.title.includes(ymd)) {
//   errors.push('1日1つしかログを作ることはできません。今日は既にログを作成しています。');
// }

if (errors.length > 0) {
  alert(errors.map(e => `・${e}`).join('\n'));
} else {
  console.log(`https://scrapbox.io/${LOGS_PROJ_NAME}/${title}?body=${encodeURIComponent(body.join('\n'))}`);
  // window.open(`https://scrapbox.io/${logsProjName}/${title}?body=${encodeURIComponent(body)}`)
}

