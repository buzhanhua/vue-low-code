import { computed, createVNode, defineComponent, inject, onBeforeUnmount, onMounted, provide, reactive, ref, render } from "vue";

export const DropdownItem = defineComponent({
    props: {
        label: String,
        icon: String,
    },
    setup(props){
        let { icon, label } = props;
        const hide = inject('hide');
        return () => <div class="dropdown-item" onClick={hide}>
            <i class={icon}></i>
            <span>{label}</span>
        </div>
    }
})

const DropdownComponent = defineComponent({
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
            showDropdown(option){
                state.isShow = true;
                state.option = option;
                let { top, left, height } = option.el.getBoundingClientRect();
                state.top = top + height;
                state.left = left;
            }
        });

        const classes = computed(() => [
            'dropdown',
            {
                'dropdown-isShow': state.isShow
            }
        ]);

        provide('hide', () => { state.isShow = false });

        const styles = computed(() => ({
            top: state.top + 'px',
            left: state.left + 'px'
        }));

        const el = ref(null);
        const onMousedownDocument = (e) => {
            // 页面的点击事件不在内容区域， 则关闭菜单栏
            if(!el.value.contains(e.target)){
                state.isShow = false;
            }
        }

        onMounted(() => {
            document.body.addEventListener('mousedown', onMousedownDocument, true);
        });

        onBeforeUnmount(() => {
            document.body.removeEventListener('mousedown', onMousedownDocument);
        })
        return () => {
            return <div class={classes.value} style={styles.value} ref={el}>
                { state.option.content() }
            </div>
        }
        // vue3里面的插槽都是一个个的函数
    }
})

// vue3实现手动挂载
let vm;
export function $dropdown(option){ 
    // vue2 手动挂载组件 new SubComponent.$mount()
    if(!vm){
        // 1. 创建一个元素
        let el = document.createElement('div');
        // 2. 创建虚拟节点
        vm = createVNode(DropdownComponent, {option});
        // 3. 将组件渲染到这个元素上
        render(vm, el);
        // 4. 将元素插入页面
        document.body.appendChild(el);
    }
    // 5. 调用组件暴露的方法
    const { showDropdown } = vm.component.exposed;

    showDropdown(option);
}