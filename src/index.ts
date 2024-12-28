import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity, LSPluginBaseInfo, PageEntity } from '@logseq/libs/dist/LSPlugin.user'
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { generateEmbed } from './embed/generateBlock'
import { addLeftMenuNavHeader, clearEle, removeProvideStyle } from './embed/lib'
import cssMain from './main.css?inline'
import { handleScrolling } from './scroll'
import { keySettingsPageStyle, settingsTemplate, styleList } from './settings'
import af from "./translations/af.json"
import de from "./translations/de.json"
import es from "./translations/es.json"
import fr from "./translations/fr.json"
import id from "./translations/id.json"
import it from "./translations/it.json"
import ja from "./translations/ja.json"
import ko from "./translations/ko.json"
import nbNO from "./translations/nb-NO.json"
import nl from "./translations/nl.json"
import pl from "./translations/pl.json"
import ptBR from "./translations/pt-BR.json"
import ptPT from "./translations/pt-PT.json"
import ru from "./translations/ru.json"
import sk from "./translations/sk.json"
import tr from "./translations/tr.json"
import uk from "./translations/uk.json"
import zhCN from "./translations/zh-CN.json"
import zhHant from "./translations/zh-Hant.json"

export const mainPageTitle = "Draft-Notes-Plugin" // メインページのタイトル
export const mainPageTitleLower = mainPageTitle.toLowerCase()
export const shortKey = "mrn"
const keyCssMain = "main"
const keyToolbar = "Draft-Notes"
const keyPageBarId = `${shortKey}--pagebar`
const toolbarIcon = "💻"
const keyToggleButton = `${shortKey}--changeStyleToggle`
const keySettingsButton = `${shortKey}--pluginSettings`
const keyRunButton = `${shortKey}--run`
const keyCloseButton = `${shortKey}--close`
const keyAllDeleteButton = `${shortKey}--allDelete`
const keyLeftMenu = `${shortKey}--nav-header`
const keyCssRemoveDrafts = `${shortKey}--removeDrafts`
export const templatePageTitle = mainPageTitle + "/Template"
export const templateName = "draft-notes-plugin"


/* main */
const main = async () => {

  // l10nのセットアップ
  await l10nSetup({
    builtinTranslations: {//Full translations
      ja, af, de, es, fr, id, it, ko, "nb-NO": nbNO, nl, pl, "pt-BR": ptBR, "pt-PT": ptPT, ru, sk, tr, uk, "zh-CN": zhCN, "zh-Hant": zhHant
    }
  })

  /* user settings */
  logseq.useSettingsSchema(settingsTemplate(t("Draft")))


  // ツールバーにボタンを追加
  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `
    <div>
      <a class="button icon" data-on-click="${keyToolbar}" style="font-size: 18px" title="${mainPageTitle} ${t("plugin")}">${toolbarIcon}</a>
    </div>
    `,
  })

  // ページバーにボタンを追加
  logseq.App.registerUIItem('pagebar', {
    key: keyPageBarId,
    template: `
      <div id="${keyPageBarId}" title="${mainPageTitle} ${t("plugin")}">
      <button id="${keyToggleButton}" data-on-click="${keyToggleButton}" title="${t("Change Style")}">🎨</button>
      <button id="${keySettingsButton}" data-on-click="${keySettingsButton}" title="${t("Plugin Settings")}">⚙</button>
      <button id="${keyRunButton}" data-on-click="${keyRunButton}" title="${t("Update page list.")}">◆ ${t("Reload")}</button>
      <button id="${keyCloseButton}" data-on-click="${keyCloseButton}" title="${t("Press this button when finished.")}">✖ ${t("Close")}</button>
      <button id="${keyAllDeleteButton}" data-on-click="${keyAllDeleteButton}" title="" style="color:red"><small>${t("All delete")}</small></button>
      </div>
      <style>
      #${keyPageBarId} {
        display: none;
      }
      div.page:has([id="${t(mainPageTitleLower)}"]) #${keyPageBarId} {
        display: block;
      }
      </style>
      `,
  })



  // メニューバーのヘッダーに追加
  if (logseq.settings!.addLeftMenu === true)
    addLeftMenuNavHeader(keyLeftMenu, toolbarIcon, keyToolbar, mainPageTitle)



  let processingButton = false
  //クリックイベント
  logseq.provideModel({

    // ツールバーボタンが押されたら
    [keyToolbar]: async () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      const pageEntity = await logseq.Editor.getPage(mainPageTitle, { includeChildren: false }) as PageEntity | null
      if (pageEntity) {
        logseq.App.pushState('page', { name: mainPageTitle })// ページを開く
      } else {
        await logseq.Editor.createPage(mainPageTitle, { public: false }, { redirect: true, createFirstBlock: true, journal: false })
        setTimeout(() => {
          const runButton = parent.document.getElementById(keyRunButton) as HTMLElement | null
          if (runButton)
            runButton.click()
        }, 300)
      }
      logseq.UI.showMsg(`${mainPageTitle}`, "info", { timeout: 2200 })
    },

    // トグルボタンが押されたら
    [keyToggleButton]: () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      // スタイルを順番に切り替える
      logseq.updateSettings({
        [keySettingsPageStyle]: styleList[(styleList.indexOf(logseq.settings![keySettingsPageStyle] as string) + 1) % styleList.length]
      })
    },

    // 設定ボタンが押されたら
    [keySettingsButton]: () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      logseq.showSettingsUI()
    },

    // 実行ボタンが押されたら
    [keyRunButton]: async () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      // ページ内容の更新をおこなう
      await updateMainContent("page")
    },

    // 閉じるボタンが押されたら
    [keyCloseButton]: () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      logseq.Editor.deletePage(mainPageTitle)
    },

    // 全削除ボタンが押されたら
    [keyAllDeleteButton]: async () => {
      if (processingButton) return
      processingButton = true
      setTimeout(() => processingButton = false, 100)

      // ページの全削除
      for (let i = 1; i <= (logseq.settings!.count as number); i++)
        await logseq.Editor.deletePage(`${logseq.settings!.draftTitleWord}${i}`)
    },

  })


  logseq.App.onRouteChanged(async ({ path, template }) => handleRouteChange(path, template))//ページ読み込み時に実行コールバック
  // logseq.App.onPageHeadActionsSlotted(async () => handleRouteChange())//Logseqのバグあり。動作保証が必要


  // CSSを追加
  logseq.provideStyle({ style: cssMain, key: keyCssMain })

  if (logseq.settings!.removeDraftFromRecent as boolean === true)
    removeDraftsFromRecent()// 左メニューの履歴リストから、各ドラフトを取り除く

  // プラグインが有効になったとき
  // document.bodyのクラスを変更する
  if (logseq.settings![keySettingsPageStyle])
    parent.document.body.classList.add(`${shortKey}-${logseq.settings![keySettingsPageStyle]}`)


  // プラグイン設定変更時
  logseq.onSettingsChanged(async (newSet: LSPluginBaseInfo['settings'], oldSet: LSPluginBaseInfo['settings']) => {

    // スタイル変更時の処理
    if (newSet[keySettingsPageStyle] !== oldSet[keySettingsPageStyle]) {
      //document.bodyのクラスを変更する
      if (oldSet[keySettingsPageStyle])
        parent.document.body.classList.remove(`${shortKey}-${oldSet[keySettingsPageStyle]}`)
      if (newSet[keySettingsPageStyle])
        parent.document.body.classList.add(`${shortKey}-${newSet[keySettingsPageStyle]}`)
    }

    if (oldSet.addLeftMenu !== newSet.addLeftMenu) {
      if (newSet.addLeftMenu === false)
        clearEle(`${shortKey}--nav-header`)
      else
        addLeftMenuNavHeader(keyLeftMenu, toolbarIcon, keyToolbar, mainPageTitle)
    }

    if (oldSet.removeDraftFromRecent === false && newSet.removeDraftFromRecent === true)
      removeDraftsFromRecent()
    else
      if (oldSet.removeDraftFromRecent === true && newSet.removeDraftFromRecent === false)
        removeProvideStyle(keyCssRemoveDrafts)
    // 更新
    if (oldSet.draftTitleWord !== newSet.draftTitleWord)
      removeDraftsFromRecent()

  })


  // プラグインが無効になったとき
  logseq.beforeunload(async () => {
    if (logseq.settings![keySettingsPageStyle])
      parent.document.body.classList.remove(`${shortKey}-${logseq.settings![keySettingsPageStyle]}`)

  })


}/* end_main */




let now = false
// ページを開いたとき
let isProcessingRootChanged = false
const handleRouteChange = async (path: string, template: string) => {
  if (template !== "/page/:name" //ページ以外は除外
    || isProcessingRootChanged) return
  isProcessingRootChanged = true
  setTimeout(() => isProcessingRootChanged = false, 100)

  const pageName = path.replace(/^\/page\//, "")
  if (pageName === mainPageTitle) {
    now = true
    await updateMainContent("page")
    // スクロールを縦ではなく横にする (ホイールイベント)
    handleScrolling() // Note: 一部スタイルのみで動作させるが、イベントリスナー内で判定している
  } else
    if (now = true) {
      now = false
      // 必ずHomeに移動してしまうバグがあるためdeletePage()は使えないので、ブロックのみを削除
      const blockEntities = await logseq.Editor.getPageBlocksTree(mainPageTitle) as BlockEntity[] | null
      if (blockEntities) {
        await logseq.Editor.updateBlock(blockEntities[0].uuid, "", {})
        if (blockEntities[0]) {
          const children = blockEntities[0].children as BlockEntity[] | undefined
          if (children)
            for (const child of children)
              await logseq.Editor.removeBlock(child.uuid)

        }
      }
    }
}


const updateMainContent = async (type: "page") => {
  const blocks = await logseq.Editor.getCurrentPageBlocksTree() as { uuid: BlockEntity["uuid"] }[]
  if (blocks) {
    // 全てのブロックを削除
    for (const block of blocks)
      await logseq.Editor.removeBlock(block.uuid)

    // メインページの最初のブロックを作成
    const newBlockEntity = await logseq.Editor.appendBlockInPage(mainPageTitle, "") as { uuid: BlockEntity["uuid"] } | null

    if (newBlockEntity)
      if (type === "page")
        await generateEmbed(newBlockEntity.uuid)
  }
}


// 左メニューの履歴リストから、各ドラフトを取り除く
const removeDraftsFromRecent = async () => {
  if (logseq.settings!.draftTitleWord)
    logseq.provideStyle({
      style: `
  #left-sidebar li[title^="${logseq.settings!.draftTitleWord as string}"i] {
      display: none;
  }
    `,
      key: keyCssRemoveDrafts,
    })
}


logseq.ready(main).catch(console.error)