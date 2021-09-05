import { computed, defineComponent, inject, ref, watch } from "vue";
import "./editor.scss";
import EditorBlock from "./editor-block.jsx";
import deepcopy from "deepcopy";
import { useMenuDragger } from "./useMenuDragger";
import { useFocus } from "./useFocus";
import { useBlockDragger } from "./useBlockDragger";
import { useCommand } from "./useCommand";
import { $dialog } from "../components/Dialog";
import { ElButton } from "element-plus";
import { $dropdown, DropdownItem } from "../components/Dropdown";
import EditorOperator from "./editor-operator";
export default defineComponent({
  props: {
    modelValue: { type: Object },
    formData: { type: Object },
  },
  emits: ["update:modelValue"],
  components: {
    EditorBlock,
  },
  setup(props, ctx) {
    // 预览
    const previewRef = ref(false);

    // 编辑
    const editorRef = ref(true);

    const data = computed({
      get() {
        return props.modelValue;
      },
      set(newValue) {
        ctx.emit("update:modelValue", deepcopy(newValue));
      },
    });
    const containerStyles = computed(() => ({
      width: data.value.container.width + "px",
      height: data.value.container.height + "px",
    }));

    const config = inject("config");

    const containerRef = ref(null);

    // 1. 实现菜单的拖拽功能
    const { dragstart, dragend } = useMenuDragger(containerRef, data);

    // 2. 实现获取焦点

    const {
      blockMousedown,
      containerMousedown,
      focusData,
      lastSelectBlock,
      clearBlockFocus,
    } = useFocus(data, previewRef, (e) => {
      // 按下绑定事件
      mousedown(e);
    });

    // 3. 实现block的拖拽

    const { mousedown, markLine } = useBlockDragger(
      focusData,
      lastSelectBlock,
      data
    );

    // 4. 实现指令

    const { commands } = useCommand(data, focusData);

    const buttons = [
      { label: "撤回", icon: "icon-back", handler: () => commands.undo() },
      { label: "重做", icon: "icon-forward", handler: () => commands.redo() },
      {
        label: "导出",
        icon: "icon-export",
        handler: () => {
          $dialog({
            title: "导出JSON",
            content: JSON.stringify(data.value),
          });
        },
      },
      {
        label: "导入",
        icon: "icon-import",
        handler: () => {
          $dialog({
            title: "导入JSON",
            content: "",
            footer: true,
            onConfirm(text) {
              // data.value = JSON.parse(text); 这样更改无法保留历史记录
              commands.updateContainer(JSON.parse(text));
            },
          });
        },
      },
      {
        label: "置顶",
        icon: "icon-place-top",
        handler: () => commands.placeTop(),
      },
      {
        label: "置底",
        icon: "icon-place-bottom",
        handler: () => commands.placeBottom(),
      },
      { label: "删除", icon: "icon-delete", handler: () => commands.delete() },
      {
        label: () => (previewRef.value ? "编辑" : "预览"),
        icon: () => (previewRef.value ? "icon-edit" : "icon-browse"),
        handler: () => {
          previewRef.value = !previewRef.value;
          clearBlockFocus();
        },
      },
      {
        label: "关闭",
        icon: "icon-close",
        handler: () => {
          editorRef.value = false;
        },
      },
    ];

    const onContextMenuClick = (e, block) => {
      e.preventDefault();
      $dropdown({
        el: e.target,
        content: () => (
          <>
            <DropdownItem
              label="删除"
              icon="icon-delete"
              onClick={() => {
                commands.delete();
              }}
            />
            <DropdownItem
              label="置顶"
              icon="icon-place-top"
              onClick={() => {
                commands.placeTop();
              }}
            />
            <DropdownItem
              label="置底"
              icon="icon-place-bottom"
              onClick={() => {
                commands.placeBottom();
              }}
            />
            <DropdownItem
              label="查看"
              icon="icon-browse"
              onClick={() => {
                $dialog({
                  title: "查看节点数据",
                  content: JSON.stringify(block),
                });
              }}
            />
            <DropdownItem
              label="导入"
              icon="icon-import"
              onClick={() => {
                $dialog({
                  title: "导入节点数据",
                  content: "",
                  footer: true,
                  onConfirm(text) {
                    text = JSON.parse(text);
                    commands.updateBlock(text, block);
                  },
                });
              }}
            />
          </>
        ),
      });
    };

    return () =>
      !editorRef.value ? (
        <div
          class="editor-container-canvas-content"
          style={containerStyles.value}
          style="margin:0"
        >
          {data.value.blocks.map((block, index) => (
            <EditorBlock class="editor-block-preview" block={block} formData={props.formData}/>
          ))}
          <ElButton
            onClick={() => {
              editorRef.value = true;
            }}
            style={{ position: "fixed", right: 0 }}
          >
            编辑
          </ElButton>
          <div style={{ position: "fixed", right: 0, bottom: 0 }}>{JSON.stringify(props.formData)}</div>
        </div>
      ) : (
        <div class="editor">
          <div class="editor-left">
            {config.componentList.map((component) => (
              <div
                class="editor-left-item"
                draggable
                onDragstart={(e) => dragstart(e, component)}
                onDragend={(e) => dragend(e)}
              >
                <span>{component.label}</span>
                <div>{component.preview()}</div>
              </div>
            ))}
          </div>
          <div class="editor-top">
            {buttons.map((button, index) => {
              const icon =
                typeof button.icon === "function" ? button.icon() : button.icon;
              const label =
                typeof button.label === "function"
                  ? button.label()
                  : button.label;
              return (
                <div
                  key={index}
                  class="editor-top-button"
                  onClick={button.handler}
                >
                  <i class={icon}></i>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <div class="editor-right">
            <EditorOperator
              block={lastSelectBlock.value}
              data={data.value}
              updateContainer={commands.updateContainer}
              updateBlock={commands.updateBlock}
            />
          </div>
          <div class="editor-container">
            <div class="editor-container-canvas">
              <div
                class="editor-container-canvas-content"
                style={containerStyles.value}
                ref={containerRef}
                onMousedown={(e) => {
                  containerMousedown(e);
                }}
              >
                {data.value.blocks.map((block, index) => (
                  <EditorBlock
                    class={block.focus ? "editor-block-focus" : ""}
                    class={previewRef.value ? "editor-block-preview" : ""}
                    block={block}
                    formData={props.formData}
                    onMousedown={(e) => blockMousedown(e, block, index)}
                    onContextmenu={(e) => onContextMenuClick(e, block)}
                  />
                ))}
                {markLine.x !== null && (
                  <div class="line-x" style={{ left: markLine.x + "px" }}></div>
                )}
                {markLine.y !== null && (
                  <div class="line-y" style={{ top: markLine.y + "px" }}></div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  },
});
