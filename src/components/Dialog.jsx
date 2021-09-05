import { ElButton, ElDialog, ElInput } from "element-plus";
import { createVNode, defineComponent, reactive, render } from "vue";

const DialogComponent = defineComponent({
    props: {
        option: { type: Object }
    },
    setup(props, ctx) {
        const state = reactive({
            option: props.option,
            isShow: false
        });

        // 组件向外暴露的方法
        ctx.expose({
            showDialog(option){
                state.isShow = true;
                state.option = option;
            }
        });

        const onCancel = () => {
            state.isShow = false;
        };
        const onConfirm = () => {
            state.isShow = false;
            state.option.onConfirm && state.option.onConfirm(state.option.content);
        }
        return () => {
            return <ElDialog v-model={state.isShow} title={state.option.title}>
                {{
                    default: () =><ElInput type="textarea" v-model={state.option.content} rows={10}></ElInput>,
                    footer: () => state.option.footer && <div>
                        <ElButton onClick={onCancel}>取消</ElButton>
                        <ElButton type="primary" onClick={onConfirm}>确定</ElButton>
                    </div>
                }}
            </ElDialog>
        }
        // vue3里面的插槽都是一个个的函数
    }
})

// vue3实现手动挂载
let vm;
export function $dialog(option){ 
    // vue2 手动挂载组件 new SubComponent.$mount()
    if(!vm){
        // 1. 创建一个元素
        let el = document.createElement('div');
        // 2. 创建虚拟节点
        vm = createVNode(DialogComponent, {option});
        // 3. 将组件渲染到这个元素上
        render(vm, el);
        // 4. 将元素插入页面
        document.body.appendChild(el);
    }
    // 5. 调用组件暴露的方法
    const { showDialog } = vm.component.exposed;

    showDialog(option);
}