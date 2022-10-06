const apiRoot = `https://scrapbox.io/api`;
const linksProjName = 'euthanasia-links';
const logsProjName = 'euthanasia-links-logs';

const TOTAL_CNT = 'ページ総数';
const ADDITION_CNT = '前回以降に追加されたページ数';
const APPROVAL_CNT = '前回以降に承認されたページ数';
const UNAPPROVAL_CNT = '未承認のページ数';

const i = ' '; // Scrapboxでインデントを示す文字

// 前回のログ
const prevLogs = await fetch(`${apiRoot}/pages/${logsProjName}/?limit=1`)
  .then(res => res.json())
  .then(data => data.pages);

// リンク集のページ情報
const pageList = await fetch(`${apiRoot}/pages/${linksProjName}/?limit=1`)
  .then(res => res.json());

const body = ['code: log.txt'];
const errors = [];

if (prevLogs.length > 0) {
  const found = prevLogs[0].descriptions.find(d => d.includes(TOTAL_CNT));
  if (!found) {
    errors.push('前回のログは見つかりましたが、ログの中にページ総数が見つかりませんでした。');
  }

  const prevTotalCnt = Boolean(found)
    ? parseInt(found.split(`${TOTAL_CNT}: `)[1])
    : 0;
  const additionCnt = pageList.count - prevTotalCnt;
  
  body.push(
    `${i}${`${TOTAL_CNT}: ${pageList.count}`}`,
    `${i}${`${ADDITION_CNT}: ${additionCnt}`}`,
    `${i}${`${APPROVAL_CNT}: 0`}`,
    `${i}${`${UNAPPROVAL_CNT}: 0`}`,
  );

} else {
  body.push(
    `${i}${`${TOTAL_CNT}: ${pageList.count}`}`,
    `${i}${`${ADDITION_CNT}: ${pageList.count}`}`,
    `${i}${`${APPROVAL_CNT}: 0`}`,
    `${i}${`${UNAPPROVAL_CNT}: 0`}`,
  );
}

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
const title = encodeURIComponent(`${ymd} ${hour}:${min}:${sec} 時点でのログ`);

// if (prevLogs[0]?.title.includes(ymd)) {
//   errors.push('1日1つしかログを作ることはできません。今日は既にログを作成しています。');
// }

if (errors.length > 0) {
  alert(errors.map(e => `・${e}`).join('\n'));
} else {
  console.log(`https://scrapbox.io/${logsProjName}/${title}?body=${encodeURIComponent(body.join('\n'))}`);
  // window.open(`https://scrapbox.io/${logsProjName}/${title}?body=${encodeURIComponent(body)}`)
}

