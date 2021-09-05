<template>
  <Editor v-model="state" :formData="formData"></Editor>
</template>

<script>
import { provide, ref } from 'vue';
import data from "./data.json";
import Editor from "./packages/editor.jsx";
import { registerConfig as config } from './utils/editor-config.jsx';
export default {
  name: 'App',
  components: {
    Editor,
  },
  setup() {
    const state = ref(data);
    // 全局组件配置
    provide('config', config);

    const formData = ref({
      username: 'buzhanhua',
      password: 123,
      start: 0,
      end: 100,
    })
    return {
      state,
      formData,
    }
  }
}
</script>

<style lang="scss">
#app{
  position: fixed;
  top: 20px;
  right: 20px;
  bottom: 20px;
  left: 20px;
}
</style>
