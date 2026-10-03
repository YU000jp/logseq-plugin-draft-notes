import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user'
import { booleanAppDbEra, keyAllDeleteButton, keyCloseButton, keyPageBarId, keyRunButton, keySettingsButton, keyToggleButton, keyToolbar, mainPageTitle, mainPageTitleLower, toolbarIcon } from '.'
import { generateEmbed } from './embed/generateBlock'
import { t } from 'logseq-l10n'

let now = false
// ページを開いたとき
let isProcessingRootChanged = false

export const handleRouteChange = async (path: string, template: string) => {
  if (template !== "/page/:name" //ページ以外は除外
    || isProcessingRootChanged) return
  isProcessingRootChanged = true
  setTimeout(() => isProcessingRootChanged = false, 100)

  const pageName = path.replace(/^\/page\//, "")
  if (pageName === mainPageTitle) {
    now = true
    await updateMainContent("page")
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

export const updateMainContent = async (type: "page") => {
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

export const AddToolbarAndMenuButton = () => {
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
      ${booleanAppDbEra() === false ? ` // アプリ世代が旧UI系なら従来のDOMセレクタを使う
      div.page:has([id="${t(mainPageTitleLower)}"]) #${keyPageBarId} {
        display: block
      }
      `: `
      body:is([data-page="${t(mainPageTitle)}"], [data-page="${t(mainPageTitleLower)}"]) #${keyPageBarId} {
        display: block
      }
  `}
      `,
  })
}
