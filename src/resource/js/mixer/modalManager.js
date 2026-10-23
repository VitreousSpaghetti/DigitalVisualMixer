

var showSave = false;
var content = "";
var title = "";
var closeTitle = "Close";
var confirmTitle = "Save changes";
var saveModal = function () {  }; 
/*
<div class="modal fade" id="exampleModalLong" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
<div class="modal-dialog" role="document">
  <div class="modal-content">
    <div class="modal-header">
      <h5 class="modal-title" id="contentTitle">Modal title</h5>
      <button type="button" class="close" data-dismiss="modal" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="modal-body" id="contentModal">
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-dismiss="modal" onclick="closeModal()">Close</button>
      <button type="button" class="btn btn-primary" onclick="saveModal()" >Save changes</button>
    </div>
  </div>
</div>
</div>*/
function getPanelHtml() {
  var html =
    `<div class="modal-dialog">
      <div class="modal-content">
          <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLabel">${title}</h5>
          </div>
          <div class="modal-body">
          ${content}
          </div>
          <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="closeModal()" >${closeTitle}</button>
          <button type="button" class="btn btn-primary" id="savebuttonmodal" data-bs-dismiss="modal"  onclick="saveModalAndClose()" >${confirmTitle}</button>
          </div>
      </div>
    </div>
    `;
  return html;
}
function showPanel() {
  const modalItem = document.getElementById('modalPanelHere');
  modalItem.innerHTML = '';
  modalItem.innerHTML = getPanelHtml();
  new bootstrap.Modal(modalItem).show();
  if(showSave){
    document.getElementById('savebuttonmodal').style="display: unset;";
  }else{
    document.getElementById('savebuttonmodal').style="display: none;";
  }
}
function hideModal() {
  const modalItem = document.getElementById('modalPanelHere');
  modalItem.innerHTML = ''; 
  modalItem.style="    display: none;"
  new bootstrap.Modal(modalItem).hide();
}
function saveModalAndClose() {
  saveModal();
  closeModal();
}
function closeModal() { 
  hideModal();
  showSave = false;
  content = "";
  title = "";
}
function ModalPanel(contentPass, titlePass, kotitle, functionSavePass, okTitle) {
  window.closeModal = closeModal;
  window.saveModalAndClose = saveModalAndClose;
  if (functionSavePass) {
    saveModal = functionSavePass;
    showSave = true;
    closeTitle = kotitle;
    confirmTitle = okTitle;
  }else{
    saveModal = function () { };
    showSave = false;
    closeTitle = kotitle;
  }

  content = contentPass;
  title = titlePass;
  showPanel();
}
export { ModalPanel }