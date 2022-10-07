class App {
  static ROOT = "https://scrapbox.io";
  static API_ROOT = `${App.ROOT}/api`;
  static LINKS_PROJ_NAME = "euthanasia-links";
  static LOGS_PROJ_NAME = "euthanasia-links-logs";

  static TOTAL_CNT = "ページ総数";
  static ADDITION_CNT = "前回以降に追加されたページ数";
  static APPROVAL_CNT = "前回以降に承認されたページ数";
  static UNAPPROVAL_CNT = "未承認のページ数";

  static LOG_FILE_NAME = "log.json";
  static i = (n) => " ".repeat(n); // 任意の深さのインデント文字を返す
  static formatDate = (n) => n.toString().padStart(2, "0");

  constructor() {
    this.body = [`code: ${App.LOG_FILE_NAME}`];
    this.log = [];
    this.errors = [];
  }

  async fetchData() {
    // 前回のログ
    this.prevLogPages = await fetch(
      `${App.API_ROOT}/pages/${App.LOGS_PROJ_NAME}/?limit=1`,
    )
      .then((res) => res.json())
      .then((data) => data.pages);

    // リンク集のページ情報
    this.pageList = await fetch(
      `${App.API_ROOT}/pages/${App.LINKS_PROJ_NAME}/?limit=1`,
    )
      .then((res) => res.json());
  }

  // ログ用のjsonファイルを作成する
  async createLog() {
    if (this.prevLogPages.length > 0) {
      const prevLog = await fetch(
        `${App.API_ROOT}/code/${App.LOGS_PROJ_NAME}/${
          encodeURIComponent(this.prevLogPages[0].title)
        }/${App.LOG_FILE_NAME}`,
      )
        .then((res) => res.json());
      const additionCnt = this.pageList.count - prevLog[App.TOTAL_CNT];

      this.log.push(
        `${App.i(3)}${`"${App.TOTAL_CNT}": ${this.pageList.count}`}`,
        `${App.i(3)}${`"${App.ADDITION_CNT}": ${additionCnt}`}`,
        `${App.i(3)}${`"${App.APPROVAL_CNT}": 0`}`,
        `${App.i(3)}${`"${App.UNAPPROVAL_CNT}": 0`}`,
      );
    } else {
      this.log.push(
        `${App.i(3)}${`"${App.TOTAL_CNT}": ${this.pageList.count}`}`,
        `${App.i(3)}${`"${App.ADDITION_CNT}": ${this.pageList.count}`}`,
        `${App.i(3)}${`"${App.APPROVAL_CNT}": 0`}`,
        `${App.i(3)}${`"${App.UNAPPROVAL_CNT}": 0`}`,
      );
    }

    this.body.push(`${App.i(1)}{`, this.log.join(",\n"), `${App.i(1)}}`);
  }

  createScrapboxPage() {
    const now = new Date();
    const [year, month, date, hour, min, sec] = [
      now.getFullYear(),
      ...[
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
      ].map((date) => App.formatDate(date)),
    ];

    const ymd = `${year}/${month}/${date}`;
    const title = encodeURIComponent(`${ymd} ${hour}:${min}:${sec} 時点のログ`);

    // if (this.prevLogs[0]?.title.includes(ymd)) {
    //   errors.push('1日1つしかログを作ることはできません。今日は既にログを作成しています。');
    // }

    if (this.errors.length > 0) {
      alert(this.errors.map((e) => `・${e}`).join("\n"));
    } else {
      console.log(
        `https://scrapbox.io/${App.LOGS_PROJ_NAME}/${title}?body=${
          encodeURIComponent(this.body.join("\n"))
        }`,
      );
    }
  }

  async run() {
    await this.fetchData();
    await this.createLog();
    this.createScrapboxPage();
  }
}

const app = new App();
await app.run();
