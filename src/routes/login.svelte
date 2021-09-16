<script lang="ts">
  import { afterUpdate } from 'svelte'

  let email = ''
  let password = ''
  let name = ''

  let mode: 'login' | 'signup' = 'login'

  let nameInput
  let emailInput
  let shouldFocus = true

  $: switchMode = () => {
    shouldFocus = true
    if (mode === 'login') {
      mode = 'signup'
    } else {
      mode = 'login'
    }
  }

  afterUpdate(() => {
    if (shouldFocus) {
      if (mode === 'signup' && nameInput?.focus) {
        nameInput.focus()
      } else if (mode === 'login' && emailInput?.focus) {
        emailInput.focus()
      }
      shouldFocus = false
    }
  })
</script>

<main class="max-w-sm m-auto mt-32">
  <!-- On accessibility: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/Tab_Role -->
  <form action="/api/auth/{mode}" method="post" class="grid gap-4 mb-5">
    {#if mode === 'signup'}
      <input
        name="name" id="name"
        label="Nome"
        type="text"
        bind:value={name}
        bind:this={nameInput}
      />
    {/if}
    <input
      name="email" id="email"
      label="Email"
      type="email"
      bind:value={email}
      bind:this={emailInput}
    />
    <input name="password" id="password" label="Senha" type="password" bind:value={password} />
    <button type="submit" class="p-3 py-1.5"
      >{mode === 'login' ? 'Log in' : 'Create account'}</button
    >
  </form>

  <div class="text-gray-600 text-sm text-center">
    {mode === 'login' ? 'Don\'t have a profile?' : 'Already have a profile?'}
  </div>
  <button
    on:click|preventDefault={switchMode}
    class="underline text-primary-800 text-center  block m-auto mt-1"
  >
    {mode === 'login' ? 'Create profile' : 'Log in'}
  </button>
</main>
