class App {
  static ROOT = "https://scrapbox.io";
  static API_ROOT = `${App.ROOT}/api`;
  static LINKS_PROJ_NAME = "euthanasia-links";
  static LOGS_PROJ_NAME = "euthanasia-links-logs";
  static LOG_FILE_NAME = "log.json";

  static TOTAL_CNT = "ページ総数";
  static UNAPPROVAL_CNT = "未承認のページ数";
  static ADDITION_CNT = "前回以降に追加されたページ数";
  static APPROVAL_CNT = "前回以降に承認されたページ数";
  static CNT_VALUE = "値";
  static CNT_DIFF = "前回比";

  static i = (n) => " ".repeat(n); // 任意の深さのインデント文字を返す

  static formatDate = (n) => n.toString().padStart(2, "0");

  static handleError = (res) => {
    const status = parseInt(res.status);
    if (200 <= status && status < 400) return res;
    else throw new Error(`HTTPステータスコード ${res.status}`);
  };

  // deno-fmt-ignore
  static addSign(n) {
    return n > 0 
      ? `+${n}`
      : n === 0
      ? `±${0}`
      : `${n}`;
  }

  constructor() {
    this.body = [`code: ${App.LOG_FILE_NAME}`];
    this.log = {};
    this.errors = [];
    this.approvalCnt = 0;
    this.unapprovalCnt = 0;
  }

  async getAllPagesAndCount() {
    // 一度に100件までしか取得できないので、skipパラメータを更新しながら、件数が100を下回るまでfetchする
    const pages = [];
    const params = new URLSearchParams([["sort", "created"]]);
    let skip = 0;

    while (true) {
      params.delete("skip");
      params.append("skip", skip);
      const res = await fetch(
        `${App.API_ROOT}/pages/${App.LINKS_PROJ_NAME}?${params.toString()}`,
      );
      const data = await App.handleError(res).json();
      pages.push(...data.pages);
      skip += data.pages.length;

      if (data.pages.length < 100) break;
    }

    for (const page of pages) {
      if (page.title.includes("🚧")) { // 未承認
        this.unapprovalCnt++;
      } else if (!page.title.includes("🙈") && !page.pin) { // 承認済み
        this.approvalCnt++;
      }
    }
  }

  async fetchData() {
    try {
      const q = [];
      const params = new URLSearchParams([["limit", "1"], ["sort", "created"]])
        .toString();

      // ログファイル群のプロジェクトデータと前回のログファイルを取得する
      q.push(
        await fetch(`${App.API_ROOT}/pages/${App.LOGS_PROJ_NAME}?${params}`),
      );
      this.logProjectData = await App.handleError(q.pop()).json();

      if (this.logProjectData.pages.length > 0) {
        q.push(
          await fetch(
            `${App.API_ROOT}/code/${App.LOGS_PROJ_NAME}/${
              encodeURIComponent(this.logProjectData.pages[0].title)
            }/${App.LOG_FILE_NAME}`,
          ),
        );
        this.prevLog = await App.handleError(q.pop()).json();
      }

      // リンク集のプロジェクトデータを取得する
      q.push(
        await fetch(`${App.API_ROOT}/pages/${App.LINKS_PROJ_NAME}?${params}`),
      );
      this.linksProjectData = await App.handleError(q.pop()).json();

      // 承認済み・未承認ページ数を数える
      await this.getAllPagesAndCount();
    } catch (error) {
      this.errors.push(`実行時エラーが発生しました。詳細: ${error.message}`);
    }
  }

  // ログ用のjsonファイルを作成する
  createLog() {
    if (this.errors.length > 0) return;

    this.log[App.TOTAL_CNT] = this.linksProjectData.count;
    this.log[App.UNAPPROVAL_CNT] = this.unapprovalCnt;

    if (this.prevLog) {
      const additionCnt = this.linksProjectData.count -
        this.prevLog[App.TOTAL_CNT];
      const addtionCntDiff = additionCnt -
        this.prevLog[App.ADDITION_CNT][App.CNT_VALUE];

      this.log[App.ADDITION_CNT] = {
        [App.CNT_VALUE]: additionCnt,
        [App.CNT_DIFF]: App.addSign(addtionCntDiff),
      };

      const approvalCntDiff = this.approvalCnt -
        this.prevLog[App.APPROVAL_CNT][App.CNT_VALUE];

      this.log[App.APPROVAL_CNT] = {
        [App.CNT_VALUE]: this.approvalCnt,
        [App.CNT_DIFF]: App.addSign(approvalCntDiff),
      };
    } else {
      this.log[App.ADDITION_CNT] = {
        [App.CNT_VALUE]: this.linksProjectData.count,
        [App.CNT_DIFF]: App.addSign(0),
      };

      this.log[App.APPROVAL_CNT] = {
        [App.CNT_VALUE]: this.approvalCnt,
        [App.CNT_DIFF]: App.addSign(0),
      };
    }

    // Scrapboxのコードブロック内に収まるように整形する
    this.body.push(
      JSON
        .stringify(this.log, null, "\t")
        .split("\n")
        .map((line) => App.i(1) + line)
        .join("\n"),
    );
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
    const title = encodeURIComponent(`${ymd} ${hour}:${min}:${sec}`);

    this.body.push(
      "",
      `#${year}年 #${month}月`,
    );

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
    this.createLog();
    this.createScrapboxPage();
  }
}

const app = new App();
await app.run();
