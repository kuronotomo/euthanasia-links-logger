class App {
  static ROOT = "https://scrapbox.io";
  static API_ROOT = `${App.ROOT}/api`;
  static LINKS_PROJECT_NAME = "euthanasia-links";
  static LOGS_PROJECT_NAME = "euthanasia-links-logs";
  static LOG_FILE_NAME = "log.json";

  static TOTAL_CNT = "ページ総数";
  static UNAPPROVAL_CNT = "未承認のページ数";
  static ADDITION_CNT = "前回以降に追加されたページ数";
  static APPROVAL_CNT = "前回以降に承認されたページ数";
  static CNT_VALUE = "値";
  static CNT_DIFF = "前回比";
  static CREATED_AT = "作成時刻";

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

  static within24Hours(prev, current) {
    return prev + (60 * 60 * 24) * 1000 >= current;
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
        `${App.API_ROOT}/pages/${App.LINKS_PROJECT_NAME}?${params.toString()}`,
      );
      const data = await App.handleError(res).json();
      pages.push(...data.pages);
      skip += data.pages.length;

      if (data.pages.length < 100) break;
    }

    for (const page of pages) {
      if (!page.pin) {
        if (page.title.includes("🚧")) { // 未承認
          this.unapprovalCnt++;
        } else { // 承認済み
          this.approvalCnt++;
        }
      }
    }
  }

  async fetchData() {
    try {
      const q = [];
      const params = new URLSearchParams([["sort", "created"]]).toString();

      // ログファイル保管庫のプロジェクトデータを取得する
      q.push(
        await fetch(
          `${App.API_ROOT}/pages/${App.LOGS_PROJECT_NAME}?${params}`,
        ),
      );
      this.logsProjectData = await App.handleError(q.pop()).json();

      // 前回のログファイルを取得する
      if (this.logsProjectData.pages.length > 0) {
        for (const page of this.logsProjectData.pages) {
          if (!page.pin) {
            q.push(
              await fetch(
                `${App.API_ROOT}/code/${App.LOGS_PROJECT_NAME}/${
                  encodeURIComponent(page.title)
                }/${App.LOG_FILE_NAME}`,
              ),
            );

            this.prevLogPage = page;
            this.prevLogFile = await App.handleError(q.pop()).json();
            break;
          }
        }
      }

      // リンク集のプロジェクトデータを取得する
      q.push(
        await fetch(
          `${App.API_ROOT}/pages/${App.LINKS_PROJECT_NAME}?${params}`,
        ),
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

    if (this.prevLogFile) {
      const additionCnt = this.linksProjectData.count -
        this.prevLogFile[App.TOTAL_CNT];
      const addtionCntDiff = additionCnt -
        this.prevLogFile[App.ADDITION_CNT][App.CNT_VALUE];

      this.log[App.ADDITION_CNT] = {
        [App.CNT_VALUE]: additionCnt,
        [App.CNT_DIFF]: App.addSign(addtionCntDiff),
      };

      const approvalCntDiff = this.approvalCnt -
        this.prevLogFile[App.APPROVAL_CNT][App.CNT_VALUE];

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

    this.log[App.CREATED_AT] = new Date().getTime();

    // Scrapboxのコードブロック内に収まるように整形する
    this.body.push(
      JSON
        .stringify(this.log, null, "\t")
        .split("\n")
        .map((line) => App.i(1) + line)
        .join("\n"),
    );
  }

  async createScrapboxPage() {
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
    const title = encodeURIComponent(`${year}/${month}/${date} ${hour}:${min}:${sec}`);

    this.body.push(
      "",
      `#${year}年 #${month}月`,
    );

    if (this.prevLogPage) {
      this.body.push(
        "",
        "前回のログ",
        `${App.i(1)}[${this.prevLogPage.title}]`,
      );
    }

    if (
      this.prevLogFile &&
      App.within24Hours(this.prevLogFile[App.CREATED_AT], now.getTime())
    ) {
      this.errors.push("前回から24時間以上経たないと、新しいログを作成することはできません。");
    }

    if (this.errors.length > 0) {
      alert(this.errors.map((e) => "・" + e).join("\n"));
    } else {
      const url = `https://scrapbox.io/${App.LOGS_PROJECT_NAME}/${title}?body=${
        encodeURIComponent(this.body.join("\n"))
      }`;

      if (window.open && confirm("新しいログを作成しますか？")) {
        window.open(url);
      } else {
        const p = Deno.run({
          cmd: ["open", url],
          stderr: "piped",
          stdout: "piped",
        });
        await p.status();
      }
    }
  }

  async run() {
    this.errors = [];

    await this.fetchData();
    this.createLog();
    await this.createScrapboxPage();
  }
}

const app = new App();

if (window?.scrapbox) {
  // deno-fmt-ignore
  scrapbox.PageMenu.addMenu({
    title: "create log",
    image: "https://scrapbox.io/files/63409ea9b31bcb00220f6979.png",
    onClick: async () => await app.run(),
  });
} else {
  await app.run();
}
